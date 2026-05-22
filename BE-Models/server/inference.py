import os
import sys
import torch
import sentencepiece as sp
from PIL import Image
from torchvision import transforms, utils as vutils

# Setup paths to import from src/
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
DEBACK_DIR = os.path.abspath(os.path.join(SERVER_DIR, ".."))
SRC_DIR = os.path.join(DEBACK_DIR, "src")
CONFIGS_DIR = os.path.join(DEBACK_DIR, "configs")
MODELS_DIR = os.path.join(DEBACK_DIR, "outputs", "models")

sys.path.append(SRC_DIR)

try:
    from Model import SeparateEncoder, Codebook, FuseDecoder
    from Translation import AuxTITTransformer
    from config_loader import load_config
except ImportError as e:
    print(f"[Deback Pipeline] Critical failure importing model definitions: {e}")
    # Re-raise to ensure we don't start in a broken state
    raise

class DebackPipeline:
    def __init__(self):
        # Determine best device
        if torch.backends.mps.is_available():
            self.device = torch.device("mps")
            print("[Deback Pipeline] Utilizing Apple Metal Performance Shaders (MPS)")
        elif torch.cuda.is_available():
            self.device = torch.device("cuda")
            print("[Deback Pipeline] Utilizing CUDA GPU")
        else:
            self.device = torch.device("cpu")
            print("[Deback Pipeline] Utilizing CPU")

        # Set up image transformation (resizing and normalization as per TestDataset)
        self.transform = transforms.Compose([
            transforms.Resize((48, 512)), # Force size in case user uploads arbitary size
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5000, 0.5000, 0.5000], std=[0.5000, 0.5000, 0.5000])
        ])

        self.loaded = False

    def load_models(self):
        """Preload all models into RAM/VRAM to eliminate I/O delay during inference."""
        print("[Deback Pipeline] Loading models...")

        # --- Auto-Download missing checkpoints from Hugging Face ---
        repo_id = "masterdzzzz/debackX"
        models_to_download = [
            ("checkpoint_best0.023.pt", os.path.join(MODELS_DIR, "separate")),
            ("checkpoint_best0.039.pt", os.path.join(MODELS_DIR, "codebook")),
            ("checkpoint_best0.846.pt", os.path.join(MODELS_DIR, "translation")),
            ("checkpoint_best0.006.pt", os.path.join(MODELS_DIR, "fuse")),
        ]
        
        try:
            from huggingface_hub import hf_hub_download
            import shutil
            for filename, local_dir in models_to_download:
                local_path = os.path.join(local_dir, filename)
                if not os.path.exists(local_path):
                    print(f"[Deback Pipeline] Downloading {filename} from Hugging Face ({repo_id})...")
                    os.makedirs(local_dir, exist_ok=True)
                    cached_path = hf_hub_download(repo_id=repo_id, filename=filename)
                    shutil.copy2(cached_path, local_path)
                    print(f"[Deback Pipeline] Saved {filename} to {local_path}")
        except ImportError:
            print("[Deback Pipeline] WARNING: 'huggingface_hub' is not installed. Run 'pip install huggingface_hub' to enable auto-download.")
        except Exception as e:
            print(f"[Deback Pipeline] Error downloading models: {e}")

        # 1. Separate
        sep_ckpt_path = os.path.join(MODELS_DIR, "separate", "checkpoint_best0.023.pt")
        sep_config_path = os.path.join(CONFIGS_DIR, "config-separate.json")
        _, _, sep_mcfg = load_config(sep_config_path)
        self.separate_model = SeparateEncoder(sep_mcfg["patch_size"])
        self.separate_model.load_state_dict(torch.load(sep_ckpt_path, map_location="cpu")["model_state"])
        self.separate_model.to(self.device).eval()

        # 2. Codebook
        cb_ckpt_path = os.path.join(MODELS_DIR, "codebook", "checkpoint_best0.039.pt")
        cb_config_path = os.path.join(CONFIGS_DIR, "config-codebook.json")
        _, _, cb_mcfg = load_config(cb_config_path)
        self.codebook_model = Codebook(cb_mcfg["patch_size"], cb_mcfg["dim"], cb_mcfg["codebook_dim"], cb_mcfg["codebook_size"])
        
        # Sửa lỗi size mismatch cho vq._codebook.initted
        cb_state_dict = torch.load(cb_ckpt_path, map_location="cpu")["model_state"]
        for key in list(cb_state_dict.keys()):
            if "vq._codebook.initted" in key:
                if cb_state_dict[key].shape != self.codebook_model.state_dict()[key].shape:
                    print(f"[Deback Pipeline] Fixing shape mismatch for {key}")
                    cb_state_dict[key] = cb_state_dict[key].reshape(self.codebook_model.state_dict()[key].shape)
        
        self.codebook_model.load_state_dict(cb_state_dict)
        self.codebook_model.to(self.device).eval()

        # 3. Translation
        trans_ckpt_path = os.path.join(MODELS_DIR, "translation", "checkpoint_best0.846.pt")
        trans_config_path = os.path.join(CONFIGS_DIR, "config-translation.json")
        trans_data_cfg, _, trans_mcfg = load_config(trans_config_path)
        
        # Override SP path to local
        sp_path = os.path.join(DEBACK_DIR, "scripts", "iimt30k_vi.model")
        if not os.path.exists(sp_path):
            sp_path = os.path.join(DEBACK_DIR, "scripts", "multi30k.model")
        
        self.text_sp = sp.SentencePieceProcessor(model_file=sp_path)
        self.text_bos, self.text_eos, self.text_pad_id = self.text_sp.piece_to_id(['<s>', '</s>', '<pad>'])
        num_vocab = self.text_sp.piece_size()

        self.translation_model = AuxTITTransformer(
            num_vocab, cb_mcfg["codebook_size"] + 2, trans_mcfg["text_d_model"], 
            trans_mcfg["code_d_model"], trans_mcfg["text_d_ff"], trans_mcfg["code_d_ff"], 
            trans_mcfg["text_n_head"], trans_mcfg["code_n_head"], trans_mcfg["text_l"], 
            trans_mcfg["code_l"], self.text_pad_id, trans_mcfg["dropout"]
        )
        self.translation_model.load_state_dict(torch.load(trans_ckpt_path, map_location="cpu")["model_state"])
        self.translation_model.to(self.device).eval()

        # 4. Fuse
        fuse_ckpt_path = os.path.join(MODELS_DIR, "fuse", "checkpoint_best0.006.pt")
        fuse_config_path = os.path.join(CONFIGS_DIR, "config-fuse.json")
        _, _, fuse_mcfg = load_config(fuse_config_path)
        self.fuse_model = FuseDecoder(fuse_mcfg["patch_size"])
        self.fuse_model.load_state_dict(torch.load(fuse_ckpt_path, map_location="cpu")["model_state"])
        self.fuse_model.to(self.device).eval()
        
        self.loaded = True
        print("[Deback Pipeline] All models loaded successfully.")

    def run_inference(self, input_img_path, output_dir):
        """
        Runs the full 3-stage pipeline on a single image.
        Outputs are saved into output_dir.
        Returns the translated text.
        """
        if not self.loaded:
            self.load_models()

        os.makedirs(output_dir, exist_ok=True)
        
        # Paths for generated files
        back_path = os.path.join(output_dir, "back.jpg")
        text_en_path = os.path.join(output_dir, "text_en.jpg")
        text_vi_path = os.path.join(output_dir, "text_vi.jpg")
        fuse_path = os.path.join(output_dir, "fuse.jpg")
        tit_path = os.path.join(output_dir, "tit.txt")

        # Load and transform image
        img = Image.open(input_img_path).convert("RGB")
        img_tensor = self.transform(img).unsqueeze(0).to(self.device) # Add batch dimension

        with torch.no_grad():
            from torch import autocast
            # Use autocast if MPS or CUDA is available to speed up execution
            device_type = 'cuda' if self.device.type == 'cuda' else ('mps' if self.device.type == 'mps' else 'cpu')
            
            with autocast(device_type=device_type, enabled=device_type in ['cuda', 'mps']):
                
                # --- STAGE 1: SEPARATE ---
                sep_out = self.separate_model(img_tensor)
                back_tensor = sep_out["back_img"]
                text_en_tensor = sep_out["text_img"]
                
                # Save stage 1
                vutils.save_image(back_tensor[0] * 0.5 + 0.5, back_path)
                vutils.save_image(text_en_tensor[0] * 0.5 + 0.5, text_en_path)
                
                # --- STAGE 2: TRANSLATE ---
                # Codebook extracts features from source text image
                cb_out = self.codebook_model(text_en_tensor)
                src_code = cb_out["code"]

                # Translate code features
                trans_out = self.translation_model.inference_code(
                    src_code, 8192, 96, self.text_eos, self.text_bos, self.text_pad_id, 64
                )
                tgt_code = trans_out["code"]
                tgt_text = trans_out["text"][0] # Single item
                
                # Render target text image
                tgt_img_tensor = self.codebook_model.inference_img_with_code(tgt_code)["img"]
                
                # Save stage 2
                vutils.save_image(tgt_img_tensor[0] * 0.5 + 0.5, text_vi_path)
                translated_str = self.text_sp.decode(tgt_text.tolist())
                with open(tit_path, "w", encoding="utf-8") as f:
                    f.write(translated_str)

                # --- STAGE 3: FUSE ---
                fuse_out = self.fuse_model(back_tensor, tgt_img_tensor)
                final_fuse_tensor = fuse_out["img"]
                
                # Save stage 3
                vutils.save_image(final_fuse_tensor[0] * 0.5 + 0.5, fuse_path)

        return translated_str

# Singleton instance to expose
pipeline = DebackPipeline()
