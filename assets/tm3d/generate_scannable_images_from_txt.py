from PIL import Image
import numpy as np
import utils

FILE_PATH = 'C:/Users/Atlas/Documents/Scratch/The Mast/'
NAME = 'data'

# GENERATE A LIST OF PIXELS
# 1 pixel is 14 bits, 2 ascii chars can fit into it

output, metadata = [], []

print('loading compressed_textures')

with open('compressed_textures.txt') as f:
    compressed_textures = f.read()

if len(compressed_textures) % 2 == 1:
    compressed_textures = compressed_textures+' '
else:
    compressed_textures = compressed_textures+'  '

for i in range(len(compressed_textures)//2):
    char1 = ord(compressed_textures[i*2])
    char2 = ord(compressed_textures[i*2+1])
    code = char1 + char2*128
    '''print(ord(' '))
    print(ord('~'))
    print(compressed_textures[i])
    print(compressed_textures[i+1])
    print(char1)
    print(char2)
    print(code)
    print(f'{code:07b}'.zfill(14))
    print(utils.bin_to_col(f'{code:07b}'.zfill(14)))'''
    output.append(utils.bin_to_col(f'{code:07b}'.zfill(14)))


# GENERATE IMAGES

IMAGE_WIDTH = 460
IMAGE_HEIGHT = 340
PIXELS = IMAGE_WIDTH * IMAGE_HEIGHT

# pad the output so it is a multiple of PIXELS
for _ in range((PIXELS - len(output)) % PIXELS):
    output.append((128, 128, 128))

# split the output into many arrays for separate images...
output_split = np.array_split(output, len(output)/PIXELS)

print('generating images...')

for i, chunk in enumerate(output_split):

    arr = np.array(chunk, np.uint8)
    newarr = np.flip(arr.reshape(IMAGE_HEIGHT, IMAGE_WIDTH, 3), 0)

    im = Image.fromarray(obj=newarr, mode='RGB')
    im.save(
        f'{FILE_PATH}scannable_images/{NAME}{i}.png')


# SAVE METADATA IMAGE

print('generating metadata...')

META_WIDTH = 32
META_HEIGHT = 32
META_PIXELS = META_WIDTH * META_HEIGHT

metadata.append('')
metadata.append('end of chunks, extra data as follows...')
metadata.append('!chunks,' + str(len(output_split)))
metadata.append('!width,' + str(IMAGE_WIDTH))
metadata.append('!height,' + str(IMAGE_HEIGHT))
metadata.append('!textures,' + 'deprecated')
metadata.append('Created by awesome-llama 2023')
metadata.append('!,')

metadata = utils.pad(utils.str_to_col(
    str(','.join(metadata))), (128, 128, 128), META_PIXELS)

# print(metadata)

metadata_arr = np.array(metadata, np.uint8)
metadata_newarr = np.flip(metadata_arr.reshape(META_HEIGHT, META_WIDTH, 3), 0)

im = Image.fromarray(obj=metadata_newarr, mode='RGB')
im.save(f'{FILE_PATH}scannable_images/{NAME}_metadata.png')

print('done!')
