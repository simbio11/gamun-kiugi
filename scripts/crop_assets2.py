import os
from PIL import Image

out_scenes_dir = os.path.abspath("src/assets/scenes")
out_albums_dir = os.path.abspath("src/assets/albums")

os.makedirs(out_scenes_dir, exist_ok=True)
os.makedirs(out_albums_dir, exist_ok=True)

# 1. Image 1 (2x2)
p1 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836919881-3b903db8-da85-44a5-9b38-de5e38d4b399.png"
if os.path.exists(p1):
    with Image.open(p1) as img:
        w, h = img.size
        mx, my = w // 2, h // 2
        img.crop((0, 0, mx, my)).save(os.path.join(out_albums_dir, "album_first_birthday.webp"), "WEBP", quality=85)
        img.crop((mx, 0, w, my)).save(os.path.join(out_albums_dir, "album_school_in.webp"), "WEBP", quality=85)
        img.crop((0, my, mx, h)).save(os.path.join(out_albums_dir, "album_grad.webp"), "WEBP", quality=85)
        img.crop((mx, my, w, h)).save(os.path.join(out_albums_dir, "album_wedding.webp"), "WEBP", quality=85)
        print("Cropped Image 1 (4 albums)")

# 2. Image 2 (2x2, 3 items)
p2 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836924183-02538a94-1410-4d05-9ac5-6ad42c45c2ad.png"
if os.path.exists(p2):
    with Image.open(p2) as img:
        w, h = img.size
        mx, my = w // 2, h // 2
        img.crop((0, 0, mx, my)).save(os.path.join(out_albums_dir, "album_sixty.webp"), "WEBP", quality=85)
        img.crop((mx, 0, w, my)).save(os.path.join(out_albums_dir, "album_family.webp"), "WEBP", quality=85)
        img.crop((0, my, mx, h)).save(os.path.join(out_albums_dir, "album_funeral.webp"), "WEBP", quality=85)
        print("Cropped Image 2 (3 albums)")

# 3. Image 3 (Top / Bottom)
p3 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836928928-6e9bd676-81b4-44c1-b3ae-0c33a9abbbab.png"
if os.path.exists(p3):
    with Image.open(p3) as img:
        w, h = img.size
        my = h // 2
        img.crop((0, 0, w, my)).save(os.path.join(out_scenes_dir, "hist_1988_olympic.webp"), "WEBP", quality=85)
        img.crop((0, my, w, h)).save(os.path.join(out_scenes_dir, "hist_1997_imf.webp"), "WEBP", quality=85)
        print("Cropped Image 3 (2 hist scenes)")

# 4. Image 4 (Top / Bottom)
p4 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836934405-049ca0ab-fffe-4b3e-a981-e1f1e450b2b7.png"
if os.path.exists(p4):
    with Image.open(p4) as img:
        w, h = img.size
        my = h // 2
        img.crop((0, 0, w, my)).save(os.path.join(out_scenes_dir, "hist_1999_dotcom.webp"), "WEBP", quality=85)
        img.crop((0, my, w, h)).save(os.path.join(out_scenes_dir, "hist_2008_crisis.webp"), "WEBP", quality=85)
        print("Cropped Image 4 (2 hist scenes)")

# 6. Image 6 (3 parts: Top / Mid / Bottom)
p6 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836952735-e9449cb4-52ab-4c01-af86-bf3e6febf5c7.png"
if os.path.exists(p6):
    with Image.open(p6) as img:
        w, h = img.size
        y1, y2 = h // 3, (2 * h) // 3
        img.crop((0, 0, w, y1)).save(os.path.join(out_scenes_dir, "romance_dating.webp"), "WEBP", quality=85)
        img.crop((0, y1, w, y2)).save(os.path.join(out_scenes_dir, "romance_inlaws.webp"), "WEBP", quality=85)
        img.crop((0, y2, w, h)).save(os.path.join(out_scenes_dir, "romance_honeymoon.webp"), "WEBP", quality=85)
        print("Cropped Image 6 (3 romance scenes)")

# 7. Image 7 (3 parts: Top / Mid / Bottom)
p7 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836957273-8e16a7d0-087f-4c17-b2c9-2799ecc72c03.png"
if os.path.exists(p7):
    with Image.open(p7) as img:
        w, h = img.size
        y1, y2 = h // 3, (2 * h) // 3
        img.crop((0, 0, w, y1)).save(os.path.join(out_scenes_dir, "leisure_night_fishing.webp"), "WEBP", quality=85)
        img.crop((0, y1, w, y2)).save(os.path.join(out_scenes_dir, "leisure_camping.webp"), "WEBP", quality=85)
        img.crop((0, y2, w, h)).save(os.path.join(out_scenes_dir, "leisure_jazz_bar.webp"), "WEBP", quality=85)
        print("Cropped Image 7 (3 leisure scenes)")

# 8. Image 8 (3 parts: Top / Mid / Bottom)
p8 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836961714-f6db41d1-5900-4695-9fb9-2095f219aeef.png"
if os.path.exists(p8):
    with Image.open(p8) as img:
        w, h = img.size
        y1, y2 = h // 3, (2 * h) // 3
        img.crop((0, 0, w, y1)).save(os.path.join(out_scenes_dir, "life_classroom.webp"), "WEBP", quality=85)
        img.crop((0, y1, w, y2)).save(os.path.join(out_scenes_dir, "life_pojangmacha.webp"), "WEBP", quality=85)
        img.crop((0, y2, w, h)).save(os.path.join(out_scenes_dir, "life_factory.webp"), "WEBP", quality=85)
        print("Cropped Image 8 (3 life scenes)")

# 9. Image 9 (Top / Bottom)
p9 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836966117-692e72dd-909c-4282-bd03-d4ca1232854c.png"
if os.path.exists(p9):
    with Image.open(p9) as img:
        w, h = img.size
        my = h // 2
        img.crop((0, 0, w, my)).save(os.path.join(out_scenes_dir, "crisis_photoline.webp"), "WEBP", quality=85)
        img.crop((0, my, w, h)).save(os.path.join(out_scenes_dir, "crisis_prison.webp"), "WEBP", quality=85)
        print("Cropped Image 9 (2 crisis scenes)")

# 10. Image 10 (Top / Bottom)
p10 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836974504-c1320c7e-864c-40d8-8318-31a877066b3f.png"
if os.path.exists(p10):
    with Image.open(p10) as img:
        w, h = img.size
        my = h // 2
        img.crop((0, 0, w, my)).save(os.path.join(out_scenes_dir, "asset_supercar_garage.webp"), "WEBP", quality=85)
        img.crop((0, my, w, h)).save(os.path.join(out_scenes_dir, "asset_yacht_marina.webp"), "WEBP", quality=85)
        print("Cropped Image 10 (2 asset scenes)")

# 11. Image 11 (Top / Bottom)
p11 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836978750-e51ea365-0bd6-41ad-9daf-7c1c0a1a608e.png"
if os.path.exists(p11):
    with Image.open(p11) as img:
        w, h = img.size
        my = h // 2
        img.crop((0, 0, w, my)).save(os.path.join(out_scenes_dir, "asset_gangnam_building.webp"), "WEBP", quality=85)
        img.crop((0, my, w, h)).save(os.path.join(out_scenes_dir, "asset_resort_villa.webp"), "WEBP", quality=85)
        print("Cropped Image 11 (2 building/resort scenes)")

# 12. Image 12 (Top / Bottom)
p12 = r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836984995-7b1c0e23-76cd-4102-a642-bc874c4399c1.png"
if os.path.exists(p12):
    with Image.open(p12) as img:
        w, h = img.size
        my = h // 2
        img.crop((0, 0, w, my)).save(os.path.join(out_scenes_dir, "life_gosi_room.webp"), "WEBP", quality=85)
        img.crop((0, my, w, h)).save(os.path.join(out_scenes_dir, "hj_forger_room.webp"), "WEBP", quality=85)
        print("Cropped Image 12 (2 study/workshop scenes)")

print("All 25 new scenes and albums cropped and saved successfully!")
