"""
VieTrans Inference Pipeline (Gradio Space Client)
─────────────────────────────────────────────────
This module delegates the image translation pipeline to the Hugging Face Gradio Space,
avoiding the need to load heavy model weights locally.
"""

import os
import sys
import shutil
import warnings
from pathlib import Path
from PIL import Image

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

# Load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Gradio Space configuration
GRADIO_SPACE_URL = os.getenv("GRADIO_SPACE_URL", "masterdzzzz/vietrans-modelspace")
# HF token if needed to call private or restricted spaces
HF_TOKEN = os.getenv("HF_TOKEN")

class DebackPipeline:
    """
    Delegated pipeline that calls the Hugging Face Space using gradio_client.
    """

    def __init__(self):
        self.space_url = GRADIO_SPACE_URL
        self.client = None
        self.loaded = False
        print(f"[Pipeline] Client initialized to target Space: {self.space_url}")

    def load_models(self):
        """Connect to the Hugging Face Gradio Space."""
        if self.loaded:
            return

        print(f"[Pipeline] Connecting to Gradio Space at {self.space_url}...")
        try:
            from gradio_client import Client
            # Initialize the client (will fetch the API endpoints of the Space)
            if HF_TOKEN:
                self.client = Client(self.space_url, token=HF_TOKEN)
            else:
                self.client = Client(self.space_url)
            self.loaded = True
            print("[Pipeline] Connected to Gradio Space successfully.")
        except Exception as e:
            print(f"[Pipeline] Error connecting to Gradio Space: {e}")
            raise e

    def run_inference(self, input_img_path, output_dir):
        """
        Calls the Gradio Space API endpoint to process the image and saves the
        downloaded output images and translation text locally.
        """
        if not self.loaded:
            self.load_models()

        os.makedirs(output_dir, exist_ok=True)
        print(f"[Pipeline] Sending image {input_img_path} to Space for translation...")

        try:
            from gradio_client import handle_file
            # Wrap image file path for upload
            input_file = handle_file(input_img_path)

            # Predict using the API endpoint "/translate"
            # Outputs: (fuse_img, text_en_img, text_vi_img, back_img, translated_text)
            result = self.client.predict(
                input_image=input_file,
                api_name="/translate"
            )
        except Exception as e:
            print(f"[Pipeline] Gradio Space prediction failed: {e}")
            raise e

        # Validate result tuple
        if not result or len(result) < 5:
            raise ValueError(f"Gradio Space returned invalid result structure: {result}")

        # Gradio Client automatically downloads the output files to local cache
        fuse_cache = result[0]
        text_en_cache = result[1]
        text_vi_cache = result[2]
        back_cache = result[3]
        translated_text = result[4]

        # Define destination file paths
        fuse_dest = os.path.join(output_dir, "fuse.jpg")
        text_en_dest = os.path.join(output_dir, "text_en.jpg")
        text_vi_dest = os.path.join(output_dir, "text_vi.jpg")
        back_dest = os.path.join(output_dir, "back.jpg")
        tit_dest = os.path.join(output_dir, "tit.txt")

        # Copy the downloaded images to the output directory
        def _copy(src, dest):
            if src and os.path.exists(src):
                shutil.copy(src, dest)
            else:
                print(f"[Pipeline] Warning: Expected output file not found in cache: {src}")

        _copy(fuse_cache, fuse_dest)
        _copy(text_en_cache, text_en_dest)
        _copy(text_vi_cache, text_vi_dest)
        _copy(back_cache, back_dest)

        # Clean the returned status text (remove status/success label prefixes)
        clean_text = str(translated_text or "")
        prefixes = [
            "✅ Dịch thành công!\n\n",
            "⚠️ Không phát hiện chữ tiếng Anh trong ảnh.\n\n",
            "⚠️ Không phát hiện chữ tiếng Anh trong ảnh."
        ]
        for prefix in prefixes:
            if clean_text.startswith(prefix):
                clean_text = clean_text[len(prefix):]

        # Save clean translation text to tit.txt
        with open(tit_dest, "w", encoding="utf-8") as f:
            f.write(clean_text)

        print(f"[Pipeline] Inference completed successfully. Translation: '{clean_text[:50]}...'")
        return clean_text

# Singleton instance
pipeline = DebackPipeline()
