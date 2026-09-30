# Fill the hidden ground (and the sea outside the picture) by continuing the surrounding ground inward
# (OpenCV Telea inpainting): paths and edges carry across, nothing new is drawn. Runs in any venv with opencv.
import sys, cv2, numpy as np
src, mask, out = sys.argv[1:4]
img = cv2.imread(src)
m = cv2.imread(mask, cv2.IMREAD_GRAYSCALE)
m = cv2.dilate((m > 127).astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
cv2.imwrite(out, cv2.inpaint(img, m, 6, cv2.INPAINT_TELEA))
