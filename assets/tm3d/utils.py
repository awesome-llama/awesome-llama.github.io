
def col_to_bin(col):
    dec = col[0]*65536 + col[1]*256 + col[2]
    return f'{dec:07b}'.zfill(24)


def bin_to_col(bin):
    return (
        int(bin[0:5], 2) * 8,
        int(bin[5:10], 2) * 8,
        int(bin[10:14], 2) * 16
    )


def dec_to_col(dec):
    return bin_to_col(f'{dec:07b}'.zfill(14))


def str_to_col(string):
    return [bin_to_col(f'{code:07b}'.zfill(14)) for code in string.encode('ascii')]


def pad(list, fill, length):
    if len(list) > length:
        raise ValueError('Input list is larger than given length')
    else:
        return list + [fill] * (length - len(list))


if __name__ == '__main__':
    print(str_to_col('abcABC!'))

    #print(pad([1, 2, 3, 4, 51]), '', 2)
    print(pad([1, 2, 3], 'a', 10))
    print(pad([], (128, 128, 128), 5))
