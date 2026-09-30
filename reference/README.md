# Reference SPIKE projects

Put `.llsp3` files exported from the LEGO SPIKE App 3 (word blocks) here.
They are the ground truth for block opcodes, inputs, fields and shadow blocks.

```bash
npm run reference   # lists all blocks found, compares them with our compiler,
                    # and prints which of our blocks still have no reference
npm test            # tests/reference.test.ts fails on any difference
```

With no files here, `npm run reference` prints the list of blocks to export.
