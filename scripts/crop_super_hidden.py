import os
from PIL import Image

hidden_dir = os.path.abspath("src/assets/hidden")
os.makedirs(hidden_dir, exist_ok=True)

files = [
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790837430905-709f1e20-3a92-4cda-a822-ba39dfdf2e6f.png", [
        ("art_investigator_f", (56, 197, 311, 595)),
        ("michelin_inspector_m", (371, 197, 626, 595)),
        ("conservator_f", (686, 197, 941, 595)),
    ]),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790837446502-aebe9f3c-5a7b-41bf-917c-cb0afbf139f2.png", [
        ("bodyguard_m", (56, 197, 311, 595)),
        ("detective_m", (371, 197, 626, 595)),
        ("perfumer_f", (686, 197, 941, 595)),
    ]),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790837453786-cfdc61f9-aa90-4f27-a8b2-76c595f93478.png", [
        ("stargazer_f", (56, 197, 311, 595)),
        ("pope_m", (371, 197, 626, 595)),
        ("space_analyst_f", (686, 197, 941, 595)),
    ]),
]

for file_path, crops in files:
    if not os.path.exists(file_path):
        print(f"Warning: not found {file_path}")
        continue
    with Image.open(file_path) as img:
        for name, box in crops:
            cropped = img.crop(box)
            out_file = os.path.join(hidden_dir, f"{name}.webp")
            cropped.save(out_file, "WEBP", quality=90)
            print(f"Saved: {out_file} ({cropped.size})")

print("All 9 super hidden card artworks cropped successfully!")
