from PIL import Image
import numpy as np
import math
import pyperclip

FILE_PATH = 'C:/Users/Atlas/Documents/Scratch/The Mast/exported regions/'
TEX_NAMES = [
    'region_cb',
    'region_start_off',
    'region_start_on',
    'region_surface',
    'region_srf_terr',
    'region_walkways',
    'region_storage',
    'region_facility',
    'region_stairs',
    'region_tunnel',
    'region_drill',
    'region_track',
    'region_br',
    'region_base',
    'region_mast_generator',
    'region_service1',
    'region_service3',
    'region_landing_pad',
    'region_comms',
    'region_landing_pad_night',
    'tm_spaceship'
]
BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
BASE30 = '!"#$%&\'()*,-.:;<=>?@[\]^_`{|}~'
CHARS = BASE64+BASE30

compression = {}
pixels_compressed = 0
pixels_total = 0


def change_channel(colour, channels='rgb', diff=1):
    r = colour[0]
    g = colour[1]
    b = colour[2]

    if 'r' in channels:
        r = (r+diff) % 256
    if 'g' in channels:
        g = (g+diff) % 256
    if 'b' in channels:
        b = (b+diff) % 256

    return (r, g, b)


def add_chunk(name, index):
    if name in compression:
        compression[name] += 1
    else:
        compression[name] = 1

    global pixels_compressed
    pixels_compressed += 1

    return BASE30[index]


def col_to_bin(col):
    dec = col[0]*65536 + col[1]*256 + col[2]
    return f'{dec:07b}'.zfill(24)


def bin_to_b64(bin):
    return (
        BASE64[int(bin[0:6], 2)] +
        BASE64[int(bin[6:12], 2)] +
        BASE64[int(bin[12:18], 2)] +
        BASE64[int(bin[18:24], 2)]
    )


def encode_luma_diff(diffs=(0, 0, 0), min=(-1, -5, -1), max=(1, 4, 1)):
    # map numbers then convert to dec
    range = [1+b-a for a, b in zip(min, max)]
    offset = [a-b for a, b in zip(diffs, min)]
    return offset[0]*(range[1]*range[2]) + offset[1]*range[2] + offset[2]


def channel_compress(rgb=(0, 0, 0), min=(-1, -5, -1), max=(1, 4, 1), mode=1, char_i=-1):
    global unsaved
    if unsaved:
        if rgb[0] >= min[0] and rgb[1] >= min[1] and rgb[2] >= min[2]:
            if rgb[0] <= max[0] and rgb[1] <= max[1] and rgb[2] <= max[2]:
                # in range
                luma = encode_luma_diff(rgb, min, max)

                if mode == 1:
                    image_compressed.append(
                        add_chunk('luma_diff1', char_i) + CHARS[luma])
                else:
                    image_compressed.append(
                        add_chunk('luma_diff2', char_i) + CHARS[math.floor(luma/94)] + CHARS[luma % 94])

                unsaved = False


def compress_img(image_path, image_name, header=False, resize=False):
    print('loading image', image_path)

    src_img = Image.open(image_path)
    if resize:
        image = src_img.resize((src_img.width//3, src_img.height//3), 1)
    else:
        image = src_img
    # image.show()
    image_array = np.asarray(image)

    global image_compressed
    global pixels_total
    pixels_total += image.width*image.height

    header_data = [
        image_name, ' ',
        image.width*image.height, ' ',
        image.width, ' ',
        image.height, ' ',
        'checksum', ' '
    ]

    image_compressed = []

    px_prev = [(0, 0, 0) for _ in range(image.width + 2)]
    px_table = [(0, 0, 0) for _ in range(len(CHARS))]

    for row in reversed(image_array):
        for pixel in row:
            px = (pixel[0], pixel[1], pixel[2])  # rgb tuple only

            # now find the best compression for the pixel:

            if px_prev[0] == px:
                # should be replaced by rle
                image_compressed.append(add_chunk('prev', 0))

            elif px_prev[image.width] == px:
                image_compressed.append(add_chunk('vert', 1))

            elif px_prev[image.width + 1] == px:
                image_compressed.append(add_chunk('diag_back', 2))

            elif px_prev[image.width - 1] == px:
                image_compressed.append(add_chunk('diag_fwd', 3))

            elif (
                int(px_prev[0][0]) - int(px_prev[1][0]),
                int(px_prev[0][1]) - int(px_prev[1][1]),
                int(px_prev[0][2]) - int(px_prev[1][2])
            ) == (
                int(px[0]) - int(px_prev[0][0]),
                int(px[1]) - int(px_prev[0][1]),
                int(px[2]) - int(px_prev[0][2])
            ):

                image_compressed.append(add_chunk('extrapolate', 4))

            elif px in px_table:
                table_char = CHARS[px_table.index(px)]
                image_compressed.append(
                    add_chunk('table', 5) + table_char)

            else:
                # luma difference
                dr = int(px[0]) - int(px_prev[0][0])
                dg = int(px[1]) - int(px_prev[0][1])
                db = int(px[2]) - int(px_prev[0][2])

                global unsaved
                unsaved = True

                rgb = (dr-dg, dg, db-dg)

                channel_compress(rgb, (-1, -15, -1), (1, -6, 1), 1, 6)
                channel_compress(rgb, (-1, -5, -1), (1, 4, 1), 1, 7)
                channel_compress(rgb, (-1, 5, -1), (1, 14, 1), 1, 8)

                channel_compress(rgb, (-7, -58, -7), (7, -20, 7), 2, 10)
                channel_compress(rgb, (-7, -19, -7), (7, 19, 7), 2, 9)
                channel_compress(rgb, (-7, 20, -7), (7, 58, 7), 2, 11)

                if unsaved:  # RGB, no compression
                    image_compressed.append(bin_to_b64(col_to_bin(px)))

            # finally update the lists
            px_prev.insert(0, px)
            px_prev.pop(-1)
            px_table[(px[0]*3 + px[1]*5 + px[2]*7) % 94] = px

    # 2nd pass (less destructive) to add rle
    image_compressed2 = []
    repeat = 0
    for chunk in image_compressed:
        if chunk == '!' and repeat < 95:
            repeat += 1
        else:
            if repeat > 1:
                # save rle for repeats more than 1
                image_compressed2.append('~' + CHARS[repeat-2])
                # A is now repeat 2
            elif repeat > 0:
                # just save !
                image_compressed2.append('!')
            image_compressed2.append(chunk)
            repeat = 0

    # generate a checksum
    checksum = 0
    for char in ''.join(str(x) for x in image_compressed2):
        checksum += CHARS.index(char) + 1  # convert char to number and add
    header_data[8] = checksum

    if header:  # insert header into data
        for h in reversed(header_data):
            image_compressed2.insert(0, h)

    print(f'compressed {pixels_compressed}/{image.width*image.height}')
    print(compression)

    return ''.join(str(x) for x in image_compressed2)

# -----------------------------------------------


# remember to generate scannable images from text after!
RUN = 7

############
if RUN == 1:
    # full size images
    images = []
    for name in TEX_NAMES:
        images.append(compress_img(
            f'{FILE_PATH}{name}.png', name, header=True, resize=False))

    with open('compressed_textures_full.txt', 'w') as f:
        f.write(' '.join(images))

elif RUN == 2:
    # all resized images
    images = []
    for name in TEX_NAMES:
        images.append(compress_img(
            f'{FILE_PATH}{name}.png', name, header=True, resize=True))

    with open('compressed_textures_low.txt', 'w') as f:
        f.write(' '.join(images))

elif RUN == 3:
    # pod
    with open('compressed_pod.txt', 'w') as f:
        f.write(compress_img(f'{FILE_PATH}region_pod.png',
                             'region_pod', header=False, resize=False))

elif RUN == 4:
    # debug
    with open('beach.txt', 'w') as f:
        f.write(compress_img(
            'C:/Users/Atlas/Documents/Scratch/Image Format/beach.png', 'beach', header=True))

elif RUN == 5:
    # full size images FOR THE WEBSITE WITH ESCAPED CHARS
    images = []
    for name in TEX_NAMES:
        images.append(compress_img(
            f'{FILE_PATH}{name}.png', name, header=True, resize=False))
        # break

    data = ' '.join(images)

    data_cleaned = []
    for char in data:
        if char == '"' or char == '\\':
            data_cleaned.append('\\')

        data_cleaned.append(char)

    print(len(data_cleaned))

    with open('compressed_textures_web.txt', 'w') as f:
        f.write(''.join(data_cleaned) + ' data_end 0 0 0 0')

elif RUN == 6:
    # NPP REMIX
    # full size images
    NPPPATH = 'C:/Users/Atlas/Documents/Scratch/The Mast/NPP3D/'
    images = []
    for name in ['region_start', 'region_drain', 'region_shafts', 'region_nuclear']:
        images.append(compress_img(
            f'{NPPPATH}{name}.png', name, header=True, resize=False))

    with open(f'{NPPPATH}npp_compressed_textures_full.txt', 'w') as f:
        f.write(' '.join(images))

elif RUN == 7:
    # PLANT WALL REMIX
    # full size images
    NPPPATH = 'C:/Users/Atlas/Documents/Scratch/The Mast/Plant Wall/'
    images = []
    for name in ['region_atrium']:
        images.append(compress_img(
            f'{NPPPATH}{name}.png', name, header=True, resize=True))

    with open(f'{NPPPATH}pw_compressed_textures_full.txt', 'w') as f:
        f.write(' '.join(images))

print(pixels_total)
#compress_img('C:/Users/Atlas/Documents/Scratch/Image Format/beach.png')

#img = compress_img(f'{FILE_PATH}region_cb.png', 'cb')
# print(len(img))

#compress_img('C:/Users/Atlas/Documents/Scratch/Image Format/test.png')
# compress_img(f'{FILE_PATH}region_pod.png')
#img = compress_img(f'{FILE_PATH}region_service3.png', 'region_pod')
