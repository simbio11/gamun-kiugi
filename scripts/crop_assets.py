import os
from PIL import Image

# 1차 배너 이미지 (상하 분할: 0~H/2, H/2~H)
banners_info = [
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836032971-dd635454-d010-41ab-b051-41ca98336237.png", "race", "suneung"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836038750-5a880ca5-911d-4f40-a758-d807155d9ea6.png", "auction", "start_pitch"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836042540-6bb9cba5-88b5-4098-9848-7cd1f3daf87b.png", "audition", "quiz"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836046413-e48090e1-2404-4de8-ad62-c006f8cd59ba.png", "golf", "election"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836052299-4a450aed-056c-4388-957a-dbda18c1f250.png", "trial", "e_sports"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836055853-00c09079-9965-4ad1-916d-3447fdacd691.png", "hospital", "yacht"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836059956-e1f19d2a-a901-46a9-9e06-3e4f22bafa33.png", "cooking", "chess"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836068526-3b046341-baf3-4cea-8fa7-f262c99208be.png", "stock_battle", "media_mogul"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836072935-f92e481e-8835-40a9-9b64-914eed3f714e.png", "president", "best_actor"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836076509-8962ba80-5b25-49fa-b0b6-e05cc017f689.png", "nobel", "architect"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836080161-0b06d97d-7858-4a89-8aaf-26c0d7eb6770.png", None, "space_founder"),
]

# 2차 테마 배경 이미지 (좌우 분할: 0~W/2, W/2~W)
themes_info = [
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836282207-c4c15694-c281-4b85-a2bb-87ab5e4eceb9.png", "tier1", "tier2"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836287361-4fbdccc5-94c6-4fe1-9b6d-f3c54f411eb6.png", "tier3", "tier4"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836291788-b22b77a4-e00b-4113-985a-89437c4c650e.png", "tier5", "hj_private_jet"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836296149-5ea8ecad-620d-4ade-9405-f7f45e37afb2.png", "hj_underground_dealer", "hj_mafia"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836307492-eb9733ce-de05-4d8c-8acf-d97547d86c93.png", "hj_vtuber", "hj_chess_master"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836312000-573c95bf-0a64-488c-8707-ad716201b8ee.png", "hj_hacker", "hj_shaman"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836316590-bb647c24-9060-4eb8-a46b-6f68fc8f4ca5.png", "hj_adventurer", "hj_memecoin"),
    (r"C:\Users\cmksc\AppData\Local\Temp\orca-paste-1790836321504-e1a4e195-08be-47a9-a5ee-3cc7aa8fdf55.png", None, "hj_cult"),
]

events_dir = os.path.abspath("src/assets/events")
themes_dir = os.path.abspath("src/assets/themes")

os.makedirs(events_dir, exist_ok=True)
os.makedirs(themes_dir, exist_ok=True)

print("--- Cropping Event Banners ---")
for path, top_id, btm_id in banners_info:
    if not os.path.exists(path):
        print(f"Warning: File not found {path}")
        continue
    with Image.open(path) as img:
        w, h = img.size
        mid_y = h // 2
        
        if top_id:
            top_box = (0, 0, w, mid_y)
            top_crop = img.crop(top_box)
            out_path = os.path.join(events_dir, f"{top_id}.webp")
            top_crop.save(out_path, "WEBP", quality=85)
            print(f"Saved {out_path} ({top_crop.size})")
            
        if btm_id:
            btm_box = (0, mid_y, w, h)
            btm_crop = img.crop(btm_box)
            out_path = os.path.join(events_dir, f"{btm_id}.webp")
            btm_crop.save(out_path, "WEBP", quality=85)
            print(f"Saved {out_path} ({btm_crop.size})")

print("\n--- Cropping Theme Backgrounds ---")
for path, left_id, right_id in themes_info:
    if not os.path.exists(path):
        print(f"Warning: File not found {path}")
        continue
    with Image.open(path) as img:
        w, h = img.size
        mid_x = w // 2
        
        if left_id:
            left_box = (0, 0, mid_x, h)
            left_crop = img.crop(left_box)
            out_path = os.path.join(themes_dir, f"{left_id}.webp")
            left_crop.save(out_path, "WEBP", quality=85)
            print(f"Saved {out_path} ({left_crop.size})")
            
        if right_id:
            right_box = (mid_x, 0, w, h)
            right_crop = img.crop(right_box)
            out_path = os.path.join(themes_dir, f"{right_id}.webp")
            right_crop.save(out_path, "WEBP", quality=85)
            print(f"Saved {out_path} ({right_crop.size})")

print("\nAll assets cropped and saved successfully!")
