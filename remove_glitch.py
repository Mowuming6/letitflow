import re

def remove_crescent_from_svg(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Locate Path 29 line and remove the subpath M 420,476.666 ... 419,476Z
    # We will search for "M 420,476.666" up to the next "Z"
    pattern = r'M 420,476\.666L[^Z]+Z\s*'

    # Let's count how many we replace
    new_content, count = re.subn(pattern, '', content)

    if count > 0:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Successfully removed {count} crescent artifacts from {file_path}!")
        return True
    else:
        print(f"Could not find crescent artifact in {file_path}")
        return False

# 1. Clean public/images/LOGO.svg
remove_crescent_from_svg("public/images/LOGO.svg")

# 2. Also regenerate the home page Index.vue to keep them synchronized
# We can just import and run the builder logic directly in Python!
import inject_interactive_logo
