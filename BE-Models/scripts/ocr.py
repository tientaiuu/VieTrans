import easyocr
import os

def merge_ocr_results(results):
    sorted_results = sorted(results, key=lambda x: (x[0][0][0], x[0][0][1]))
    merged_text = ' '.join(result[1] for result in sorted_results)

    return merged_text

def _project_root():
    return os.environ.get(
        "DEBACKX_ROOT",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
    )

os.environ["CUDA_VISIBLE_DEVICES"] = "0"

reader = easyocr.Reader(['de','en']) # this needs to run only once to load the model into memory

root = _project_root()
img_dir = "/content/results/translation/test/de/text"
result_path = "/content/results/translation/test/ocr.de"

os.makedirs(os.path.dirname(result_path), exist_ok=True)

img_list = sorted(os.listdir(img_dir), key=lambda x: int(x.replace(".jpg", "")))
with open(result_path, "w") as out_f:
    for img in img_list:
        result = reader.readtext(os.path.join(img_dir, img))
        out_f.write(merge_ocr_results(result))
        out_f.write("\n")
        out_f.flush()
