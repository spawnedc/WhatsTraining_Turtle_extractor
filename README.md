# WhatsTraining_Turtle_extractor

Shamelessly copied from this amazing project: [node-dbc-reader](https://github.com/wowgaming/node-dbc-reader)

Extract dbc files from Turtle WoW data:

```bash
MPQExtractor \
  -p "$TURTLE_PATH/Data/patch.MPQ" \
  -p "$TURTLE_PATH/Data/patch-2.MPQ" \
  -p "$TURTLE_PATH/Data/patch-3.mpq" \
  -p "$TURTLE_PATH/Data/patch-4.mpq" \
  -p "$TURTLE_PATH/Data/patch-5.mpq" \
  -p "$TURTLE_PATH/Data/patch-6.mpq" \
  -p "$TURTLE_PATH/Data/patch-7.mpq" \
  -e "DBFilesClient\*" \
  -o ./data/dbc \
  "$TURTLE_PATH/Data/dbc.MPQ"
```

1. Extract required information in json format by running `npm run export`
2. Convert everything into lua files: `npm run convertToLua`
3. Copy lua files from `build/lua` to `WhatsTraining_Turtle`'s `Classes/Turtle` folder
