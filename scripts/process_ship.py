import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def remove_background(path_in, path_out, bg_tolerance=30, feather=1.5, pad=6, close_iterations=3):
    im = Image.open(path_in).convert("RGB")
    arr = np.array(im).astype(int)
    h, w, _ = arr.shape

    # Sample background color from the four corners (small patches, averaged):
    # the corners are reliably background even when the ship silhouette
    # extends close to the border elsewhere in the frame.
    patches = [arr[0:8, 0:8], arr[0:8, w - 8:w], arr[h - 8:h, 0:8], arr[h - 8:h, w - 8:w]]
    bg_color = np.median(np.concatenate([p.reshape(-1, 3) for p in patches], axis=0), axis=0)

    dist = np.sqrt(((arr - bg_color) ** 2).sum(axis=2))
    foreground = dist >= bg_tolerance

    # The ship art has thin dark seams between panels that are color-close to
    # the background: closed naively, those seams stay connected all the way
    # out to the border and the background "leaks" into the ship as holes.
    # Closing the FOREGROUND instead (dilate then erode) bridges those thin
    # seams shut first, so the background mask computed from its complement
    # no longer threads through them. Padded with True/foreground on all
    # sides so the erosion step doesn't eat the image's real border pixels.
    if close_iterations > 0:
        padw = close_iterations + 1
        padded = np.pad(foreground, padw, mode="constant", constant_values=True)
        padded = ndimage.binary_closing(padded, structure=np.ones((3, 3), dtype=bool), iterations=close_iterations)
        foreground = padded[padw:-padw, padw:-padw]

    bg_like = ~foreground

    # Keep only background-colored regions connected to the border (flood fill
    # from the edges): a dark panel on the ship itself, even if color-similar,
    # stays opaque because it is not connected to the border region.
    structure = np.ones((3, 3), dtype=bool)
    labels, _ = ndimage.label(bg_like, structure=structure)
    border_labels = set(labels[0, :].tolist()) | set(labels[-1, :].tolist()) | set(labels[:, 0].tolist()) | set(labels[:, -1].tolist())
    border_labels.discard(0)
    background_mask = np.isin(labels, list(border_labels))
    kept_mask = ~background_mask

    # Leftover grid-pattern specks just outside the silhouette (brighter than
    # the base background color, so classified as foreground) survive as
    # tiny isolated flecks: keep only the largest connected foreground
    # component (the ship itself) and drop every other speck.
    kept_labels, _ = ndimage.label(kept_mask, structure=structure)
    if kept_labels.max() > 0:
        sizes = np.bincount(kept_labels.ravel())
        sizes[0] = 0
        main_label = int(np.argmax(sizes))
        kept_mask = kept_labels == main_label

    alpha = np.where(kept_mask, 255, 0).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode="L")
    if feather > 0:
        alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(feather))

    rgba = im.convert("RGBA")
    rgba.putalpha(alpha_img)

    # Crop to the bounding box of non-transparent content, plus padding.
    bbox = alpha_img.getbbox()
    if bbox:
        left, top, right, bottom = bbox
        left = max(0, left - pad)
        top = max(0, top - pad)
        right = min(w, right + pad)
        bottom = min(h, bottom + pad)
        rgba = rgba.crop((left, top, right, bottom))

    rgba.save(path_out)
    print(f"{path_in} -> {path_out} {rgba.size}")


if __name__ == "__main__":
    remove_background(sys.argv[1], sys.argv[2])
