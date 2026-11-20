# 詳細比較レポート: 001_tana.cadiy vs 001_tana.cadiy4


## [1] Legacy <_2xPicture> (ID: 17) <--> V4 type: "textBoard" (ID: 0b9c5f00-4f79-4db2-ab73-171e5e33aad2)
**Match Reason**: Position match (0.03286978, 0.6839994, -0.03157749)

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypePicture",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.1019999,0,0.3842605",
  "StandardSize": "0.089,0.038,1.82",
  "SpecificGravity": "0",
  "UnitPrice": "0",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "Quaternion": "0.5,-0.5,-0.5,0.5",
  "Location": "0.03286978,0.6839994,-0.03157749",
  "CutValue": "Non",
  "RoundValue": "Non",
  "RoundModes": "Non",
  "GroupID": "0",
  "UniqueID": "17",
  "Hide": "false",
  "ObjectTextureID": "-1",
  "PlywoodTextureID": "-1",
  "Texture": "0",
  "CommentText": "caDIY3D WebView",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false",
  "FontSize": "60",
  "FontStyle": "Regular",
  "FontFamily": "Meiryo UI",
  "FrameVisibled": "true",
  "AspectRatioFixed": "true",
  "AspectRatio": "1.5",
  "ForeColor": "0,0,0",
  "BackColor": "255,255,255",
  "BackColorMode": "false",
  "ImageMode": "false",
  "ImageBase64ID": "1"
}
```

### V4 Properties:
```json
{
  "id": "0b9c5f00-4f79-4db2-ab73-171e5e33aad2",
  "name": "caDIY3D WebView",
  "position": {
    "x": 0.03286978,
    "y": 0.6839994,
    "z": -0.03157749
  },
  "quaternion": {
    "x": 0.5,
    "y": -0.5,
    "z": -0.5,
    "w": 0.5
  },
  "size": {
    "x": 0.1019999,
    "y": 0,
    "z": 0.3842605
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 0,
    "g": 0,
    "b": 0
  },
  "textureId": 0,
  "displayId": 8,
  "type": "textBoard",
  "text": "caDIY3D WebView",
  "fontSize": 12,
  "fontFamily": "Meiryo UI",
  "bold": false,
  "italic": false,
  "backgroundColor": {
    "r": 1,
    "g": 1,
    "b": 1,
    "a": 0
  },
  "frameVisible": true,
  "contentRotation": 90
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xPicture>` (ModelType: `eModelTypePicture`) -> V4 `type: "textBoard"`
- **Name**: Legacy CommentText=`"caDIY3D WebView"`, Text=`"undefined"` -> V4 name=`"caDIY3D WebView"`
- **Position**: Legacy Location=`0.03286978,0.6839994,-0.03157749` -> V4 position=`{"x":0.03286978,"y":0.6839994,"z":-0.03157749}`
- **Size**: Legacy Size=`0.1019999,0,0.3842605` (StandardSize=`0.089,0.038,1.82`) -> V4 size=`{"x":0.1019999,"y":0,"z":0.3842605}`
- **Quaternion**: Legacy Quaternion=`0.5,-0.5,-0.5,0.5` -> V4 quaternion=`{"x":0.5,"y":-0.5,"z":-0.5,"w":0.5}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":0,"g":0,"b":0}`, paintId=`undefined`
- **Texture**: Legacy Texture=`0`, ObjectTextureID=`-1`, PlywoodTextureID=`-1` -> V4 textureId=`0`
- **Cuts**: Legacy CutValue=`Non`, RoundValue=`Non`, RoundModes=`Non` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `FontSize="60"`, `FontStyle="Regular"`, `FontFamily="Meiryo UI"`, `FrameVisibled="true"`, `AspectRatioFixed="true"`, `AspectRatio="1.5"`, `ForeColor="0,0,0"`, `BackColor="255,255,255"`, `BackColorMode="false"`, `ImageMode="false"`, `ImageBase64ID="1"`
- **固有フィールド (V4)**: `text="caDIY3D WebView"`, `fontSize=12`, `fontFamily="Meiryo UI"`, `bold=false`, `italic=false`, `backgroundColor={"r":1,"g":1,"b":1,"a":0}`, `frameVisible=true`, `contentRotation=90`

## [2] Legacy <_2xCylinder> (ID: 3) <--> V4 type: "cylinder" (ID: legacy-3)
**Match Reason**: id == legacy-3

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypeCylinder",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0.3098039,0.3098039,1,1",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "10004",
  "Size": "0.018,0.018,0.4030007",
  "StandardSize": "0.018,0.018,0.91",
  "SpecificGravity": "0.6",
  "UnitPrice": "300",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "LinkedCutPartsText": "補強バー",
  "Quaternion": "4.892375E-08,-0.7071069,-4.892375E-08,-0.7071069",
  "Location": "0.02350004,0.3709994,-1.239011E-07",
  "CutValue": "Non",
  "RoundValue": "0,0,0,0",
  "RoundModes": "0,0,0,0",
  "GroupID": "0",
  "UniqueID": "3",
  "Hide": "false",
  "ObjectTextureID": "0",
  "PlywoodTextureID": "0",
  "Texture": "0",
  "CommentText": "南洋材丸棒",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false"
}
```

### V4 Properties:
```json
{
  "id": "legacy-3",
  "name": "南洋材丸棒",
  "position": {
    "x": 0.02350004,
    "y": 0.3709994,
    "z": -1.239011e-7
  },
  "quaternion": {
    "x": 4.892375e-8,
    "y": -0.7071069,
    "z": -4.892375e-8,
    "w": -0.7071069
  },
  "size": {
    "x": 0.018,
    "y": 0.018,
    "z": 0.4030007
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "defaultPaintId": "legacy-10004-3ba14081-0091-4f4e-9d6d-541d4579e7ff",
  "layerId": 1,
  "color": {
    "r": 1,
    "g": 1,
    "b": 0.8
  },
  "textureId": 0,
  "displayId": 9,
  "partName": "補強バー",
  "type": "cylinder",
  "unitPrice": 300,
  "specificGravity": 0.6,
  "legacyStandardSize": {
    "x": 0.018,
    "y": 0.018,
    "z": 0.91
  }
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xCylinder>` (ModelType: `eModelTypeCylinder`) -> V4 `type: "cylinder"`
- **Name**: Legacy CommentText=`"南洋材丸棒"`, Text=`"undefined"` -> V4 name=`"南洋材丸棒"`
- **Position**: Legacy Location=`0.02350004,0.3709994,-1.239011E-07` -> V4 position=`{"x":0.02350004,"y":0.3709994,"z":-1.239011e-7}`
- **Size**: Legacy Size=`0.018,0.018,0.4030007` (StandardSize=`0.018,0.018,0.91`) -> V4 size=`{"x":0.018,"y":0.018,"z":0.4030007}`
- **Quaternion**: Legacy Quaternion=`4.892375E-08,-0.7071069,-4.892375E-08,-0.7071069` -> V4 quaternion=`{"x":4.892375e-8,"y":-0.7071069,"z":-4.892375e-8,"w":-0.7071069}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`10004`, PaintDiffuse=`0.3098039,0.3098039,1,1` -> V4 color=`{"r":1,"g":1,"b":0.8}`, paintId=`undefined`
- **Texture**: Legacy Texture=`0`, ObjectTextureID=`0`, PlywoodTextureID=`0` -> V4 textureId=`0`
- **Cuts**: Legacy CutValue=`Non`, RoundValue=`0,0,0,0`, RoundModes=`0,0,0,0` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinkedCutPartsText="補強バー"`
- **固有フィールド (V4)**: `defaultPaintId="legacy-10004-3ba14081-0091-4f4e-9d6d-541d4579e7ff"`, `partName="補強バー"`, `unitPrice=300`, `specificGravity=0.6`, `legacyStandardSize={"x":0.018,"y":0.018,"z":0.91}`

## [3] Legacy <_2xBoard> (ID: 1) <--> V4 type: "board" (ID: legacy-1)
**Match Reason**: id == legacy-1

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypePineBoard",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.12,0.018,0.4",
  "StandardSize": "0.4,0.018,0.91",
  "SpecificGravity": "0.5",
  "UnitPrice": "2000",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "Quaternion": "0,0.7071068,0,0.7071068",
  "Location": "0.02500002,0.009,3.138702E-08",
  "CutValue": "0,0,0,0,0,0,0,0",
  "RoundValue": "0,0.02,0.02,0",
  "RoundModes": "0,0,0,0",
  "GroupID": "0",
  "UniqueID": "1",
  "Hide": "false",
  "ObjectTextureID": "2",
  "PlywoodTextureID": "7",
  "Texture": "2",
  "CommentText": "パイン集成材 18mm",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false"
}
```

### V4 Properties:
```json
{
  "id": "legacy-1",
  "name": "パイン集成材 18mm",
  "position": {
    "x": 0.02500002,
    "y": 0.009,
    "z": 3.138702e-8
  },
  "quaternion": {
    "x": 0,
    "y": 0.7071068,
    "z": 0,
    "w": 0.7071068
  },
  "size": {
    "x": 0.12,
    "y": 0.018,
    "z": 0.4
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 1,
    "g": 1,
    "b": 0.8
  },
  "textureId": 2,
  "displayId": 10,
  "type": "board",
  "cutAngles": [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "edgeCuts": [
    {
      "edgeIndex": 6,
      "mode": "round",
      "faceADist": 0.02,
      "faceBDist": 0.02
    },
    {
      "edgeIndex": 7,
      "mode": "round",
      "faceADist": 0.02,
      "faceBDist": 0.02
    }
  ],
  "standardRef": {
    "setId": "preset.basic",
    "standardId": "board.merkusi.18.400x910",
    "name": "メルクシパイン集成材 18mm",
    "snapshotAt": "2026-11-19T08:11:01.938Z"
  },
  "unitPrice": 2000,
  "specificGravity": 0.5,
  "remarks": "400×910mm 18mm厚"
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xBoard>` (ModelType: `eModelTypePineBoard`) -> V4 `type: "board"`
- **Name**: Legacy CommentText=`"パイン集成材 18mm"`, Text=`"undefined"` -> V4 name=`"パイン集成材 18mm"`
- **Position**: Legacy Location=`0.02500002,0.009,3.138702E-08` -> V4 position=`{"x":0.02500002,"y":0.009,"z":3.138702e-8}`
- **Size**: Legacy Size=`0.12,0.018,0.4` (StandardSize=`0.4,0.018,0.91`) -> V4 size=`{"x":0.12,"y":0.018,"z":0.4}`
- **Quaternion**: Legacy Quaternion=`0,0.7071068,0,0.7071068` -> V4 quaternion=`{"x":0,"y":0.7071068,"z":0,"w":0.7071068}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":1,"g":1,"b":0.8}`, paintId=`undefined`
- **Texture**: Legacy Texture=`2`, ObjectTextureID=`2`, PlywoodTextureID=`7` -> V4 textureId=`2`
- **Cuts**: Legacy CutValue=`0,0,0,0,0,0,0,0`, RoundValue=`0,0.02,0.02,0`, RoundModes=`0,0,0,0` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (V4)**: `cutAngles=[0,0,0,0,0,0,0,0]`, `edgeCuts=[{"edgeIndex":6,"mode":"round","faceADist":0.02,"faceBDist":0.02},{"edgeIndex":7,"mode":"round","faceADist":0.02,"faceBDist":0.02}]`, `standardRef={"setId":"preset.basic","standardId":"board.merkusi.18.400x910","name":"メルクシパイン集成材 18mm","snapshotAt":"2026-11-19T08:11:01.938Z"}`, `unitPrice=2000`, `specificGravity=0.5`, `remarks="400×910mm 18mm厚"`

## [4] Legacy <_2xBoard> (ID: 9) <--> V4 type: "board" (ID: legacy-9)
**Match Reason**: id == legacy-9

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypePineBoard",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.12,0.018,0.4",
  "StandardSize": "0.4,0.018,0.91",
  "SpecificGravity": "0.5",
  "UnitPrice": "2000",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "LinkedCutPartsText": "天板 (上段)",
  "Quaternion": "0.09229596,0.7010574,0.09229596,0.7010574",
  "Location": "0.02500004,0.4658067,-0.002329335",
  "CutValue": "0,0,0,0,0,0,0,0",
  "RoundValue": "0,0,0,0",
  "RoundModes": "0,0,0,0",
  "GroupID": "0",
  "UniqueID": "9",
  "Hide": "false",
  "ObjectTextureID": "2",
  "PlywoodTextureID": "7",
  "Texture": "2",
  "CommentText": "パイン集成材 18mm",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false"
}
```

### V4 Properties:
```json
{
  "id": "legacy-9",
  "name": "パイン集成材 18mm",
  "position": {
    "x": 0.02500004,
    "y": 0.4658067,
    "z": -0.002329335
  },
  "quaternion": {
    "x": 0.09229596,
    "y": 0.7010574,
    "z": 0.09229596,
    "w": 0.7010574
  },
  "size": {
    "x": 0.12,
    "y": 0.018,
    "z": 0.4
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 1,
    "g": 1,
    "b": 0.8
  },
  "textureId": 2,
  "displayId": 12,
  "partName": "天板 (上段)",
  "type": "board",
  "cutAngles": [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "standardRef": {
    "setId": "preset.basic",
    "standardId": "board.merkusi.18.400x910",
    "name": "メルクシパイン集成材 18mm",
    "snapshotAt": "2026-11-19T08:11:01.938Z"
  },
  "unitPrice": 2000,
  "specificGravity": 0.5,
  "remarks": "400×910mm 18mm厚"
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xBoard>` (ModelType: `eModelTypePineBoard`) -> V4 `type: "board"`
- **Name**: Legacy CommentText=`"パイン集成材 18mm"`, Text=`"undefined"` -> V4 name=`"パイン集成材 18mm"`
- **Position**: Legacy Location=`0.02500004,0.4658067,-0.002329335` -> V4 position=`{"x":0.02500004,"y":0.4658067,"z":-0.002329335}`
- **Size**: Legacy Size=`0.12,0.018,0.4` (StandardSize=`0.4,0.018,0.91`) -> V4 size=`{"x":0.12,"y":0.018,"z":0.4}`
- **Quaternion**: Legacy Quaternion=`0.09229596,0.7010574,0.09229596,0.7010574` -> V4 quaternion=`{"x":0.09229596,"y":0.7010574,"z":0.09229596,"w":0.7010574}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":1,"g":1,"b":0.8}`, paintId=`undefined`
- **Texture**: Legacy Texture=`2`, ObjectTextureID=`2`, PlywoodTextureID=`7` -> V4 textureId=`2`
- **Cuts**: Legacy CutValue=`0,0,0,0,0,0,0,0`, RoundValue=`0,0,0,0`, RoundModes=`0,0,0,0` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinkedCutPartsText="天板 (上段)"`
- **固有フィールド (V4)**: `partName="天板 (上段)"`, `cutAngles=[0,0,0,0,0,0,0,0]`, `standardRef={"setId":"preset.basic","standardId":"board.merkusi.18.400x910","name":"メルクシパイン集成材 18mm","snapshotAt":"2026-11-19T08:11:01.938Z"}`, `unitPrice=2000`, `specificGravity=0.5`, `remarks="400×910mm 18mm厚"`

## [5] Legacy <_2xBoard> (ID: 5) <--> V4 type: "board" (ID: legacy-5)
**Match Reason**: id == legacy-5

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypePineBoard",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.12,0.018,0.324",
  "StandardSize": "0.4,0.018,0.91",
  "SpecificGravity": "0.5",
  "UnitPrice": "2000",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "LinkedCutPartsText": "棚板 (下段)",
  "Quaternion": "0,0.7071068,0,0.7071068",
  "Location": "0.02500001,0.243,3.819951E-08",
  "CutValue": "0,0,0,0,0,0,0,0",
  "RoundValue": "0,0,0,0",
  "RoundModes": "0,0,0,0",
  "GroupID": "0",
  "UniqueID": "5",
  "Hide": "false",
  "ObjectTextureID": "2",
  "PlywoodTextureID": "7",
  "Texture": "2",
  "CommentText": "パイン集成材 18mm",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false"
}
```

### V4 Properties:
```json
{
  "id": "legacy-5",
  "name": "パイン集成材 18mm",
  "position": {
    "x": 0.02500001,
    "y": 0.243,
    "z": 3.819951e-8
  },
  "quaternion": {
    "x": 0,
    "y": 0.7071068,
    "z": 0,
    "w": 0.7071068
  },
  "size": {
    "x": 0.12,
    "y": 0.018,
    "z": 0.324
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 1,
    "g": 1,
    "b": 0.8
  },
  "textureId": 2,
  "displayId": 14,
  "partName": "棚板 (下段)",
  "type": "board",
  "cutAngles": [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "standardRef": {
    "setId": "preset.basic",
    "standardId": "board.merkusi.18.400x910",
    "name": "メルクシパイン集成材 18mm",
    "snapshotAt": "2026-11-19T08:11:01.938Z"
  },
  "unitPrice": 2000,
  "specificGravity": 0.5,
  "remarks": "400×910mm 18mm厚"
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xBoard>` (ModelType: `eModelTypePineBoard`) -> V4 `type: "board"`
- **Name**: Legacy CommentText=`"パイン集成材 18mm"`, Text=`"undefined"` -> V4 name=`"パイン集成材 18mm"`
- **Position**: Legacy Location=`0.02500001,0.243,3.819951E-08` -> V4 position=`{"x":0.02500001,"y":0.243,"z":3.819951e-8}`
- **Size**: Legacy Size=`0.12,0.018,0.324` (StandardSize=`0.4,0.018,0.91`) -> V4 size=`{"x":0.12,"y":0.018,"z":0.324}`
- **Quaternion**: Legacy Quaternion=`0,0.7071068,0,0.7071068` -> V4 quaternion=`{"x":0,"y":0.7071068,"z":0,"w":0.7071068}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":1,"g":1,"b":0.8}`, paintId=`undefined`
- **Texture**: Legacy Texture=`2`, ObjectTextureID=`2`, PlywoodTextureID=`7` -> V4 textureId=`2`
- **Cuts**: Legacy CutValue=`0,0,0,0,0,0,0,0`, RoundValue=`0,0,0,0`, RoundModes=`0,0,0,0` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinkedCutPartsText="棚板 (下段)"`
- **固有フィールド (V4)**: `partName="棚板 (下段)"`, `cutAngles=[0,0,0,0,0,0,0,0]`, `standardRef={"setId":"preset.basic","standardId":"board.merkusi.18.400x910","name":"メルクシパイン集成材 18mm","snapshotAt":"2026-11-19T08:11:01.938Z"}`, `unitPrice=2000`, `specificGravity=0.5`, `remarks="400×910mm 18mm厚"`

## [6] Legacy <_2xComment> (ID: 14) <--> V4 type: "comment" (ID: afc90ac8-a8ab-4941-983c-b1d65d5fc507)
**Match Reason**: Position match (0.07350001, 0.4209994, 0.0589999)

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypeComment",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.08337729,0.02056904,0",
  "StandardSize": "0.089,0.038,1.82",
  "SpecificGravity": "0",
  "UnitPrice": "0",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "Quaternion": "0,0,0,1",
  "Location": "0.07350001,0.4209994,0.0589999",
  "CutValue": "Non",
  "RoundValue": "Non",
  "RoundModes": "Non",
  "GroupID": "0",
  "UniqueID": "14",
  "Hide": "false",
  "ObjectTextureID": "0",
  "PlywoodTextureID": "-1",
  "Texture": "0",
  "CommentText": "強化バー",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false",
  "LinePattern": "0",
  "LineWidth": "1",
  "LineColor": {
    "R": "0",
    "G": "0",
    "B": "0",
    "A": "1"
  },
  "ArrowPoint": {
    "X": "0.02350004",
    "Y": "0.370999366",
    "Z": "0.008999876"
  },
  "SnapVector": {
    "X": "0",
    "Y": "0",
    "Z": "0"
  },
  "LineEndType": "eEndQube"
}
```

### V4 Properties:
```json
{
  "id": "afc90ac8-a8ab-4941-983c-b1d65d5fc507",
  "name": "強化バー",
  "position": {
    "x": 0.07350001,
    "y": 0.4209994,
    "z": 0.0589999
  },
  "quaternion": {
    "x": 0,
    "y": 0,
    "z": 0,
    "w": 1
  },
  "size": {
    "x": 0,
    "y": 0,
    "z": 0
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 0,
    "g": 0,
    "b": 0
  },
  "textureId": 0,
  "displayId": 11,
  "type": "comment",
  "text": "強化バー",
  "arrowPoint": {
    "x": 0.02350004,
    "y": 0.370999366,
    "z": 0.008999876
  },
  "fontSize": 28,
  "backgroundColor": {
    "r": 1,
    "g": 1,
    "b": 0.8,
    "a": 1
  },
  "billboard": false
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xComment>` (ModelType: `eModelTypeComment`) -> V4 `type: "comment"`
- **Name**: Legacy CommentText=`"強化バー"`, Text=`"undefined"` -> V4 name=`"強化バー"`
- **Position**: Legacy Location=`0.07350001,0.4209994,0.0589999` -> V4 position=`{"x":0.07350001,"y":0.4209994,"z":0.0589999}`
- **Size**: Legacy Size=`0.08337729,0.02056904,0` (StandardSize=`0.089,0.038,1.82`) -> V4 size=`{"x":0,"y":0,"z":0}`
- **Quaternion**: Legacy Quaternion=`0,0,0,1` -> V4 quaternion=`{"x":0,"y":0,"z":0,"w":1}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":0,"g":0,"b":0}`, paintId=`undefined`
- **Texture**: Legacy Texture=`0`, ObjectTextureID=`0`, PlywoodTextureID=`-1` -> V4 textureId=`0`
- **Cuts**: Legacy CutValue=`Non`, RoundValue=`Non`, RoundModes=`Non` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinePattern="0"`, `LineWidth="1"`, `LineColor={"R":"0","G":"0","B":"0","A":"1"}`, `ArrowPoint={"X":"0.02350004","Y":"0.370999366","Z":"0.008999876"}`, `SnapVector={"X":"0","Y":"0","Z":"0"}`, `LineEndType="eEndQube"`
- **固有フィールド (V4)**: `text="強化バー"`, `arrowPoint={"x":0.02350004,"y":0.370999366,"z":0.008999876}`, `fontSize=28`, `backgroundColor={"r":1,"g":1,"b":0.8,"a":1}`, `billboard=false`

## [7] Legacy <_2xLumber> (ID: 2) <--> V4 type: "lumber" (ID: legacy-2)
**Match Reason**: id == legacy-2

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypeLumber",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.089,0.038,0.45",
  "StandardSize": "0.089,0.038,1.82",
  "SpecificGravity": "0.4",
  "UnitPrice": "350",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "LinkedCutPartsText": "側板 (左)",
  "Quaternion": "-0.5,0.5,0.5,0.5",
  "Location": "-0.156,0.243,2.630986E-08",
  "CutValue": "-15,0,0,0,0,0,0,0",
  "RoundValue": "0,0,0,0",
  "RoundModes": "0,0,0,0",
  "GroupID": "0",
  "UniqueID": "2",
  "Hide": "false",
  "ObjectTextureID": "1",
  "PlywoodTextureID": "7",
  "Texture": "1",
  "CommentText": "SPF 2x4材",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false"
}
```

### V4 Properties:
```json
{
  "id": "legacy-2",
  "name": "SPF 2x4材",
  "position": {
    "x": -0.156,
    "y": 0.243,
    "z": 2.630986e-8
  },
  "quaternion": {
    "x": -0.5,
    "y": 0.5,
    "z": 0.5,
    "w": 0.5
  },
  "size": {
    "x": 0.089,
    "y": 0.038,
    "z": 0.45
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 1,
    "g": 1,
    "b": 0.8
  },
  "textureId": 1,
  "displayId": 13,
  "partName": "側板 (左)",
  "type": "lumber",
  "cutAngles": [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "edgeCuts": [
    {
      "edgeIndex": 6,
      "mode": "cut",
      "faceADist": 0.089,
      "faceBDist": 0.02384747812636992
    }
  ],
  "standardRef": {
    "setId": "preset.basic",
    "standardId": "lumber.spf.2x4.6f",
    "name": "SPF 2x4材",
    "snapshotAt": "2026-11-19T08:11:01.938Z"
  },
  "unitPrice": 350,
  "specificGravity": 0.4,
  "remarks": "89×38×1820mm (6F) 国内DIY最定番"
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xLumber>` (ModelType: `eModelTypeLumber`) -> V4 `type: "lumber"`
- **Name**: Legacy CommentText=`"SPF 2x4材"`, Text=`"undefined"` -> V4 name=`"SPF 2x4材"`
- **Position**: Legacy Location=`-0.156,0.243,2.630986E-08` -> V4 position=`{"x":-0.156,"y":0.243,"z":2.630986e-8}`
- **Size**: Legacy Size=`0.089,0.038,0.45` (StandardSize=`0.089,0.038,1.82`) -> V4 size=`{"x":0.089,"y":0.038,"z":0.45}`
- **Quaternion**: Legacy Quaternion=`-0.5,0.5,0.5,0.5` -> V4 quaternion=`{"x":-0.5,"y":0.5,"z":0.5,"w":0.5}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":1,"g":1,"b":0.8}`, paintId=`undefined`
- **Texture**: Legacy Texture=`1`, ObjectTextureID=`1`, PlywoodTextureID=`7` -> V4 textureId=`1`
- **Cuts**: Legacy CutValue=`-15,0,0,0,0,0,0,0`, RoundValue=`0,0,0,0`, RoundModes=`0,0,0,0` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinkedCutPartsText="側板 (左)"`
- **固有フィールド (V4)**: `partName="側板 (左)"`, `cutAngles=[0,0,0,0,0,0,0,0]`, `edgeCuts=[{"edgeIndex":6,"mode":"cut","faceADist":0.089,"faceBDist":0.02384747812636992}]`, `standardRef={"setId":"preset.basic","standardId":"lumber.spf.2x4.6f","name":"SPF 2x4材","snapshotAt":"2026-11-19T08:11:01.938Z"}`, `unitPrice=350`, `specificGravity=0.4`, `remarks="89×38×1820mm (6F) 国内DIY最定番"`

## [8] Legacy <_2xLumber> (ID: 4) <--> V4 type: "lumber" (ID: legacy-4)
**Match Reason**: id == legacy-4

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypeLumber",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.089,0.038,0.45",
  "StandardSize": "0.089,0.038,1.82",
  "SpecificGravity": "0.4",
  "UnitPrice": "350",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "LinkedCutPartsText": "側板 (右)",
  "Quaternion": "-0.5,0.5,0.5,0.5",
  "Location": "0.206,0.243,9.662472E-09",
  "CutValue": "-15,0,0,0,0,0,0,0",
  "RoundValue": "0,0,0,0",
  "RoundModes": "0,0,0,0",
  "GroupID": "0",
  "UniqueID": "4",
  "Hide": "false",
  "ObjectTextureID": "1",
  "PlywoodTextureID": "7",
  "Texture": "1",
  "CommentText": "SPF 2x4材",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false"
}
```

### V4 Properties:
```json
{
  "id": "legacy-4",
  "name": "SPF 2x4材",
  "position": {
    "x": 0.206,
    "y": 0.243,
    "z": 9.662472e-9
  },
  "quaternion": {
    "x": -0.5,
    "y": 0.5,
    "z": 0.5,
    "w": 0.5
  },
  "size": {
    "x": 0.089,
    "y": 0.038,
    "z": 0.45
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 1,
    "g": 1,
    "b": 0.8
  },
  "textureId": 1,
  "displayId": 15,
  "partName": "側板 (右)",
  "type": "lumber",
  "cutAngles": [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  "edgeCuts": [
    {
      "edgeIndex": 6,
      "mode": "cut",
      "faceADist": 0.089,
      "faceBDist": 0.02384747812636992
    }
  ],
  "standardRef": {
    "setId": "preset.basic",
    "standardId": "lumber.spf.2x4.6f",
    "name": "SPF 2x4材",
    "snapshotAt": "2026-11-19T08:11:01.939Z"
  },
  "unitPrice": 350,
  "specificGravity": 0.4,
  "remarks": "89×38×1820mm (6F) 国内DIY最定番"
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xLumber>` (ModelType: `eModelTypeLumber`) -> V4 `type: "lumber"`
- **Name**: Legacy CommentText=`"SPF 2x4材"`, Text=`"undefined"` -> V4 name=`"SPF 2x4材"`
- **Position**: Legacy Location=`0.206,0.243,9.662472E-09` -> V4 position=`{"x":0.206,"y":0.243,"z":9.662472e-9}`
- **Size**: Legacy Size=`0.089,0.038,0.45` (StandardSize=`0.089,0.038,1.82`) -> V4 size=`{"x":0.089,"y":0.038,"z":0.45}`
- **Quaternion**: Legacy Quaternion=`-0.5,0.5,0.5,0.5` -> V4 quaternion=`{"x":-0.5,"y":0.5,"z":0.5,"w":0.5}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":1,"g":1,"b":0.8}`, paintId=`undefined`
- **Texture**: Legacy Texture=`1`, ObjectTextureID=`1`, PlywoodTextureID=`7` -> V4 textureId=`1`
- **Cuts**: Legacy CutValue=`-15,0,0,0,0,0,0,0`, RoundValue=`0,0,0,0`, RoundModes=`0,0,0,0` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinkedCutPartsText="側板 (右)"`
- **固有フィールド (V4)**: `partName="側板 (右)"`, `cutAngles=[0,0,0,0,0,0,0,0]`, `edgeCuts=[{"edgeIndex":6,"mode":"cut","faceADist":0.089,"faceBDist":0.02384747812636992}]`, `standardRef={"setId":"preset.basic","standardId":"lumber.spf.2x4.6f","name":"SPF 2x4材","snapshotAt":"2026-11-19T08:11:01.939Z"}`, `unitPrice=350`, `specificGravity=0.4`, `remarks="89×38×1820mm (6F) 国内DIY最定番"`

## [9] Legacy <_2xDimension> (ID: 10) <--> V4 type: "dimension" (ID: b661a66b-1f43-4fa5-a979-af5aec7ec90e)
**Match Reason**: Position match (-0.175, 0.018, 3.72529e-8)

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypeDimension",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.3,0,0.12",
  "StandardSize": "0.089,0.038,1.82",
  "SpecificGravity": "0",
  "UnitPrice": "0",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "Quaternion": "0,0.9999999,0,0",
  "Location": "-0.175,0.018,3.72529E-08",
  "CutValue": "Non",
  "RoundValue": "Non",
  "RoundModes": "Non",
  "GroupID": "0",
  "UniqueID": "10",
  "Hide": "false",
  "ObjectTextureID": "0",
  "PlywoodTextureID": "-1",
  "Texture": "0",
  "CommentText": "120",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false",
  "LinePattern1": "0",
  "LinePattern2": "0",
  "LineWidth": "1",
  "LineColor": {
    "R": "0",
    "G": "0",
    "B": "0",
    "A": "1"
  },
  "LineEndType": "eEndArrowInside",
  "TextVisibled": "true",
  "PosDimensionValue": "Top"
}
```

### V4 Properties:
```json
{
  "id": "b661a66b-1f43-4fa5-a979-af5aec7ec90e",
  "name": "120",
  "position": {
    "x": -0.175,
    "y": 0.018,
    "z": 3.72529e-8
  },
  "quaternion": {
    "x": 0,
    "y": 0.9999999,
    "z": 0,
    "w": 0
  },
  "size": {
    "x": 0.3,
    "y": 0,
    "z": 0.12
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 0,
    "g": 0,
    "b": 0
  },
  "textureId": 0,
  "displayId": 16,
  "type": "dimension",
  "linePattern": 0,
  "auxLinePattern": 0,
  "lineWidth": 1,
  "arrowType": "inside",
  "textVisible": true,
  "valuePosition": "top",
  "symbol": "",
  "fontSize": 24,
  "billboard": false
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xDimension>` (ModelType: `eModelTypeDimension`) -> V4 `type: "dimension"`
- **Name**: Legacy CommentText=`"120"`, Text=`"undefined"` -> V4 name=`"120"`
- **Position**: Legacy Location=`-0.175,0.018,3.72529E-08` -> V4 position=`{"x":-0.175,"y":0.018,"z":3.72529e-8}`
- **Size**: Legacy Size=`0.3,0,0.12` (StandardSize=`0.089,0.038,1.82`) -> V4 size=`{"x":0.3,"y":0,"z":0.12}`
- **Quaternion**: Legacy Quaternion=`0,0.9999999,0,0` -> V4 quaternion=`{"x":0,"y":0.9999999,"z":0,"w":0}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":0,"g":0,"b":0}`, paintId=`undefined`
- **Texture**: Legacy Texture=`0`, ObjectTextureID=`0`, PlywoodTextureID=`-1` -> V4 textureId=`0`
- **Cuts**: Legacy CutValue=`Non`, RoundValue=`Non`, RoundModes=`Non` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinePattern1="0"`, `LinePattern2="0"`, `LineWidth="1"`, `LineColor={"R":"0","G":"0","B":"0","A":"1"}`, `LineEndType="eEndArrowInside"`, `TextVisibled="true"`, `PosDimensionValue="Top"`
- **固有フィールド (V4)**: `linePattern=0`, `auxLinePattern=0`, `lineWidth=1`, `arrowType="inside"`, `textVisible=true`, `valuePosition="top"`, `symbol=""`, `fontSize=24`, `billboard=false`

## [10] Legacy <_2xDimension> (ID: 11) <--> V4 type: "dimension" (ID: 41c6bc9f-96d9-4d11-9949-ced0d1779ce6)
**Match Reason**: Position match (0.02500002, 0.018, -0.05999997)

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypeDimension",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.3,0,0.4",
  "StandardSize": "0.089,0.038,1.82",
  "SpecificGravity": "0",
  "UnitPrice": "0",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "Quaternion": "0,0.7071068,0,0.7071068",
  "Location": "0.02500002,0.018,-0.05999997",
  "CutValue": "Non",
  "RoundValue": "Non",
  "RoundModes": "Non",
  "GroupID": "0",
  "UniqueID": "11",
  "Hide": "false",
  "ObjectTextureID": "0",
  "PlywoodTextureID": "-1",
  "Texture": "0",
  "CommentText": "400",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false",
  "LinePattern1": "0",
  "LinePattern2": "0",
  "LineWidth": "1",
  "LineColor": {
    "R": "0",
    "G": "0",
    "B": "0",
    "A": "1"
  },
  "LineEndType": "eEndArrowInside",
  "TextVisibled": "true",
  "PosDimensionValue": "Top"
}
```

### V4 Properties:
```json
{
  "id": "41c6bc9f-96d9-4d11-9949-ced0d1779ce6",
  "name": "400",
  "position": {
    "x": 0.02500002,
    "y": 0.018,
    "z": -0.05999997
  },
  "quaternion": {
    "x": 0,
    "y": 0.7071068,
    "z": 0,
    "w": 0.7071068
  },
  "size": {
    "x": 0.3,
    "y": 0,
    "z": 0.4
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 0,
    "g": 0,
    "b": 0
  },
  "textureId": 0,
  "displayId": 17,
  "type": "dimension",
  "linePattern": 0,
  "auxLinePattern": 0,
  "lineWidth": 1,
  "arrowType": "inside",
  "textVisible": true,
  "valuePosition": "top",
  "symbol": "",
  "fontSize": 24,
  "billboard": false
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xDimension>` (ModelType: `eModelTypeDimension`) -> V4 `type: "dimension"`
- **Name**: Legacy CommentText=`"400"`, Text=`"undefined"` -> V4 name=`"400"`
- **Position**: Legacy Location=`0.02500002,0.018,-0.05999997` -> V4 position=`{"x":0.02500002,"y":0.018,"z":-0.05999997}`
- **Size**: Legacy Size=`0.3,0,0.4` (StandardSize=`0.089,0.038,1.82`) -> V4 size=`{"x":0.3,"y":0,"z":0.4}`
- **Quaternion**: Legacy Quaternion=`0,0.7071068,0,0.7071068` -> V4 quaternion=`{"x":0,"y":0.7071068,"z":0,"w":0.7071068}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":0,"g":0,"b":0}`, paintId=`undefined`
- **Texture**: Legacy Texture=`0`, ObjectTextureID=`0`, PlywoodTextureID=`-1` -> V4 textureId=`0`
- **Cuts**: Legacy CutValue=`Non`, RoundValue=`Non`, RoundModes=`Non` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinePattern1="0"`, `LinePattern2="0"`, `LineWidth="1"`, `LineColor={"R":"0","G":"0","B":"0","A":"1"}`, `LineEndType="eEndArrowInside"`, `TextVisibled="true"`, `PosDimensionValue="Top"`
- **固有フィールド (V4)**: `linePattern=0`, `auxLinePattern=0`, `lineWidth=1`, `arrowType="inside"`, `textVisible=true`, `valuePosition="top"`, `symbol=""`, `fontSize=24`, `billboard=false`

## [11] Legacy <_2xDimension> (ID: 12) <--> V4 type: "dimension" (ID: 6c91dab7-cedb-4819-a605-77760d5b1472)
**Match Reason**: Position match (0.225, 0.468, -3.72529e-9)

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypeDimension",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.3,0,0.089",
  "StandardSize": "0.089,0.038,1.82",
  "SpecificGravity": "0",
  "UnitPrice": "0",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "Quaternion": "0.7071068,0.7071067,0,2.526447E-08",
  "Location": "0.225,0.468,-3.72529E-09",
  "CutValue": "Non",
  "RoundValue": "Non",
  "RoundModes": "Non",
  "GroupID": "0",
  "UniqueID": "12",
  "Hide": "false",
  "ObjectTextureID": "0",
  "PlywoodTextureID": "-1",
  "Texture": "0",
  "CommentText": "89",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false",
  "LinePattern1": "0",
  "LinePattern2": "0",
  "LineWidth": "1",
  "LineColor": {
    "R": "0",
    "G": "0",
    "B": "0",
    "A": "1"
  },
  "LineEndType": "eEndArrowInside",
  "TextVisibled": "true",
  "PosDimensionValue": "Top"
}
```

### V4 Properties:
```json
{
  "id": "6c91dab7-cedb-4819-a605-77760d5b1472",
  "name": "89",
  "position": {
    "x": 0.225,
    "y": 0.468,
    "z": -3.72529e-9
  },
  "quaternion": {
    "x": 0.7071068,
    "y": 0.7071067,
    "z": 0,
    "w": 2.526447e-8
  },
  "size": {
    "x": 0.3,
    "y": 0,
    "z": 0.089
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 0,
    "g": 0,
    "b": 0
  },
  "textureId": 0,
  "displayId": 18,
  "type": "dimension",
  "linePattern": 0,
  "auxLinePattern": 0,
  "lineWidth": 1,
  "arrowType": "inside",
  "textVisible": true,
  "valuePosition": "top",
  "symbol": "",
  "fontSize": 24,
  "billboard": false
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xDimension>` (ModelType: `eModelTypeDimension`) -> V4 `type: "dimension"`
- **Name**: Legacy CommentText=`"89"`, Text=`"undefined"` -> V4 name=`"89"`
- **Position**: Legacy Location=`0.225,0.468,-3.72529E-09` -> V4 position=`{"x":0.225,"y":0.468,"z":-3.72529e-9}`
- **Size**: Legacy Size=`0.3,0,0.089` (StandardSize=`0.089,0.038,1.82`) -> V4 size=`{"x":0.3,"y":0,"z":0.089}`
- **Quaternion**: Legacy Quaternion=`0.7071068,0.7071067,0,2.526447E-08` -> V4 quaternion=`{"x":0.7071068,"y":0.7071067,"z":0,"w":2.526447e-8}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":0,"g":0,"b":0}`, paintId=`undefined`
- **Texture**: Legacy Texture=`0`, ObjectTextureID=`0`, PlywoodTextureID=`-1` -> V4 textureId=`0`
- **Cuts**: Legacy CutValue=`Non`, RoundValue=`Non`, RoundModes=`Non` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinePattern1="0"`, `LinePattern2="0"`, `LineWidth="1"`, `LineColor={"R":"0","G":"0","B":"0","A":"1"}`, `LineEndType="eEndArrowInside"`, `TextVisibled="true"`, `PosDimensionValue="Top"`
- **固有フィールド (V4)**: `linePattern=0`, `auxLinePattern=0`, `lineWidth=1`, `arrowType="inside"`, `textVisible=true`, `valuePosition="top"`, `symbol=""`, `fontSize=24`, `billboard=false`

## [12] Legacy <_2xDimension> (ID: 13) <--> V4 type: "dimension" (ID: 3b4e9038-a7ee-4701-936c-31333c3643b5)
**Match Reason**: Position match (0.225, 0.243, -0.04449999)

### Legacy Raw Properties:
```json
{
  "Layer": "0",
  "ModelType": "eModelTypeDimension",
  "Diffuse": "1,1,0.8,1",
  "PaintDiffuse": "0,0,0,0",
  "Specular": "0",
  "PaintSpecular": "0",
  "PaintID": "-1",
  "Size": "0.3,0,0.45",
  "StandardSize": "0.089,0.038,1.82",
  "SpecificGravity": "0",
  "UnitPrice": "0",
  "NumberPerSet": "1",
  "SameSetID": "0",
  "IsSubParts": "false",
  "HasGuidanceURL": "false",
  "Quaternion": "0.5,0.5,-0.5000001,0.5",
  "Location": "0.225,0.243,-0.04449999",
  "CutValue": "Non",
  "RoundValue": "Non",
  "RoundModes": "Non",
  "GroupID": "0",
  "UniqueID": "13",
  "Hide": "false",
  "ObjectTextureID": "0",
  "PlywoodTextureID": "-1",
  "Texture": "0",
  "CommentText": "450",
  "NoAggregated": "false",
  "Dummy": "false",
  "Style": "eStyleNormal",
  "GroupCriteria": "false",
  "LinePattern1": "0",
  "LinePattern2": "0",
  "LineWidth": "1",
  "LineColor": {
    "R": "0",
    "G": "0",
    "B": "0",
    "A": "1"
  },
  "LineEndType": "eEndArrowInside",
  "TextVisibled": "true",
  "PosDimensionValue": "Top"
}
```

### V4 Properties:
```json
{
  "id": "3b4e9038-a7ee-4701-936c-31333c3643b5",
  "name": "450",
  "position": {
    "x": 0.225,
    "y": 0.243,
    "z": -0.04449999
  },
  "quaternion": {
    "x": 0.5,
    "y": 0.5,
    "z": -0.5000001,
    "w": 0.5
  },
  "size": {
    "x": 0.3,
    "y": 0,
    "z": 0.45
  },
  "visible": true,
  "locked": false,
  "groupId": 0,
  "layerId": 1,
  "color": {
    "r": 0,
    "g": 0,
    "b": 0
  },
  "textureId": 0,
  "displayId": 19,
  "type": "dimension",
  "linePattern": 0,
  "auxLinePattern": 0,
  "lineWidth": 1,
  "arrowType": "inside",
  "textVisible": true,
  "valuePosition": "top",
  "symbol": "",
  "fontSize": 24,
  "billboard": false
}
```

### フィールド対応関係と相違点:
- **Tag / Type**: Legacy `<_2xDimension>` (ModelType: `eModelTypeDimension`) -> V4 `type: "dimension"`
- **Name**: Legacy CommentText=`"450"`, Text=`"undefined"` -> V4 name=`"450"`
- **Position**: Legacy Location=`0.225,0.243,-0.04449999` -> V4 position=`{"x":0.225,"y":0.243,"z":-0.04449999}`
- **Size**: Legacy Size=`0.3,0,0.45` (StandardSize=`0.089,0.038,1.82`) -> V4 size=`{"x":0.3,"y":0,"z":0.45}`
- **Quaternion**: Legacy Quaternion=`0.5,0.5,-0.5000001,0.5` -> V4 quaternion=`{"x":0.5,"y":0.5,"z":-0.5000001,"w":0.5}`
- **Color / Paint**: Legacy Diffuse=`1,1,0.8,1`, PaintID=`-1`, PaintDiffuse=`0,0,0,0` -> V4 color=`{"r":0,"g":0,"b":0}`, paintId=`undefined`
- **Texture**: Legacy Texture=`0`, ObjectTextureID=`0`, PlywoodTextureID=`-1` -> V4 textureId=`0`
- **Cuts**: Legacy CutValue=`Non`, RoundValue=`Non`, RoundModes=`Non` -> V4 cuts=`undefined`
- **Layer**: Legacy Layer=`0` -> V4 layerId=`1`
- **固有フィールド (Legacy)**: `LinePattern1="0"`, `LinePattern2="0"`, `LineWidth="1"`, `LineColor={"R":"0","G":"0","B":"0","A":"1"}`, `LineEndType="eEndArrowInside"`, `TextVisibled="true"`, `PosDimensionValue="Top"`
- **固有フィールド (V4)**: `linePattern=0`, `auxLinePattern=0`, `lineWidth=1`, `arrowType="inside"`, `textVisible=true`, `valuePosition="top"`, `symbol=""`, `fontSize=24`, `billboard=false`