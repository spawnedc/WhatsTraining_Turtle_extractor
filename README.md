# WhatsTraining_Turtle_extractor

Shamelessly copied from this amazing project: [node-dbc-reader](https://github.com/wowgaming/node-dbc-reader)

1. Extract dbc files from Turtle WoW data: `MPQExtractor -p <PATH_TO_TWOW_DATA>/patch.mpq -p <PATH_TO_TWOW_DATA>/patch-*.mpq -e "DBFilesClient\*" -o ./data/dbc <PATH_TO_TWOW_DATA>/dbc.MPQ`
2. Extract required information in json format by running `npm run export`
3. Convert everything into lua files: `npm run convertToLua`
4. Copy lua files from `build/lua` to `WhatsTraining_Turtle`'s `Classes/Turtle` folder
