def load_paddleocr_engine():
    from paddleocr import PaddleOCR

    try:
        from paddlex.inference.models.runners.paddle_static.runner import (
            PaddleStaticRunner as _PSR,
        )
        if not getattr(_PSR._create, "_pir_patched", False):
            _orig_create = _PSR._create

            def _create_no_pir(self):
                self._config["enable_new_ir"] = False
                return _orig_create(self)

            _create_no_pir._pir_patched = True
            _PSR._create = _create_no_pir
            print("[Pipeline] Applied PIR executor disable patch (Space workaround)")
    except Exception as patch_err:
        print(f"[Pipeline] Warning: could not apply PIR patch: {patch_err}")

    return PaddleOCR(
        lang="en",
        ocr_version="PP-OCRv5",
        device="cpu",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        enable_mkldnn=False,
    )


def load_nllb_model(model_path, src_lang, device):
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    import torch

    tokenizer = AutoTokenizer.from_pretrained(model_path, src_lang=src_lang)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16 if device.type == "cuda" else torch.float32,
        low_cpu_mem_usage=True,
    )
    model = model.to(device)
    model.eval()
    return tokenizer, model
