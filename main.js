// XD拡張APIのクラスをインポート
const {
    Artboard,
    Text,
    Color,
    ImageFill
} = require("scenegraph");
const scenegraph = require("scenegraph");

const application = require("application");
const fs = require("uxp").storage.localFileSystem;

// 全体にかけるスケール
var scale = 4.0;

// 出力するフォルダ
var outputFolder = null;

// レスポンシブパラメータを取得するオプション
var optionGetResponsiveParameter = false;

// レスポンシブパラメータを取得するオプション
var optionEnableSubPrefab = false;

/**
 * ファイル名につかえる文字列に変換する
 * @param {*} name 
 * @param {boolean} includeDot ドットも変換対象にするか
 * @return {string}
 */
function convertToFileName(name, includeDot) {
    if (includeDot) {
        return name.replace(/[\\/:*?"<>|#\.]/g, "_");
    }
    return name.replace(/[\\/:*?"<>|#]/g, "_");
}


/**
 * ラベル名につかえる文字列に変換する
 * @param {string} name 
 * @return {string}
 */
function convertToLabel(name) {
    return name.replace(/[\\/:*?"<>|# ]/g, "_");
}


/**
 * オブジェクトのもつ全てのプロパティを表示する
 * レスポンシブデザイン用プロパティが無いか調べるときに使用
 * @param {*} obj 
 */
function printAllProperties(obj) {
    var propNames = [];
    var o = obj;
    while (o) {
        propNames = propNames.concat(Object.getOwnPropertyNames(o));
        o = Object.getPrototypeOf(o);
    }
    console.log(propNames);
}


/**
 * Alphaを除きRGBで6桁16進の色の値を取得する
 * @param {number} color 
 */
function getRGB(color) {
    const c = ("000000" + color.toString(16)).substr(-6);
    return c;
}


/**
 * グローバル座標とサイズを取得する
 * @param {scenegraph} node 
 */
function getGlobalDrawBounds(node) {
    const bounds = node.globalDrawBounds;
    return {
        x: bounds.x * scale,
        y: bounds.y * scale,
        width: bounds.width * scale,
        height: bounds.height * scale
    };
}


/**
 * グローバル座標とサイズを取得する
 * @param {scenegraph} node 
 */
function getGlobalBounds(node) {
    const bounds = node.globalBounds;
    return {
        x: bounds.x * scale,
        y: bounds.y * scale,
        width: bounds.width * scale,
        height: bounds.height * scale
    };
}


/**
 * Artboard内での座標とサイズを取得する
 * x､yはCenterMiddleでの座標になる
 * @param {scenegraph} node 
 * @param {artboard} root 
 */
function getDrawBoundsInRoot(node, root) {
    const nodeDrawBounds = getGlobalDrawBounds(node);
    console.log("node:", nodeDrawBounds);
    const rootBounds = getGlobalBounds(root);
    console.log("root:", rootBounds);
    return {
        x: nodeDrawBounds.x - rootBounds.x - rootBounds.width / 2,
        y: nodeDrawBounds.y - rootBounds.y - rootBounds.height / 2,
        width: nodeDrawBounds.width,
        height: nodeDrawBounds.height
    };
}


/**
 * オプションRasterizeチェック
 * 有効ならTrue
 * @param {string[]} options 
 * @return {boolean}
 */
function checkOptionRasterize(options) {
    const r = options["rasterize"];
    if ((typeof r) == "string") {
        const val = r.toLowerCase();
        if (val == "false" || val == "0" || val == "null") return false;
    }
    if (!r) return false;
    return true;
}


function assignPivotAndStretch(json, node) {
    if (!optionGetResponsiveParameter) {
        return null;
    }
    let pivot = getPivotAndStretch(node);
    if (pivot != null) {
        Object.assign(json, pivot);
    }
}


let counter = 1;

async function assignImage(json, node, root, subFolder, renditions, name) {
    const fileName = convertToFileName(`${name}(${counter})`, true);
    // 出力画像ファイル
    const file = await subFolder.createFile(fileName + ".png", {
        overwrite: true
    });
    counter++;

    const drawBounds = getDrawBoundsInRoot(node, root);

    Object.assign(json, {
        image: fileName,
        x: drawBounds.x,
        y: drawBounds.y,
        w: drawBounds.width,
        h: drawBounds.height,
        opacity: 100
    });

    // 画像出力登録
    renditions.push({
        node: node,
        outputFile: file,
        type: application.RenditionType.PNG,
        scale: scale
    });

    console.log("image:", drawBounds);

}


/**
 * Groupの処理 戻り値は処理したType
 * 注意:ここで､子供の処理もしてしまう
 * @param {*} json 
 * @param {scenegraph} node 
 * @param {*} funcForEachChild 
 * @param {string} name 
 * @param {string[]} options 
 */
async function extractedGroup(json, node, funcForEachChild, name, options) {
    if (optionEnableSubPrefab && name.endsWith("/")) return;
    if (name.endsWith("Button")) {
        const type = "Button";
        Object.assign(json, {
            type: type,
            name: name
        });
        assignPivotAndStretch(json, node);
        await funcForEachChild();
        return type;
    }

    if (name.endsWith("Slider")) {
        const type = "Slider";
        Object.assign(json, {
            type: type,
            name: name
        });
        await funcForEachChild();
        return type;
    }

    if (name.endsWith("Scrollbar")) {
        const type = "Scrollbar";
        Object.assign(json, {
            type: type,
            name: name
        });
        await funcForEachChild();
        return type;
    }

    if (name.endsWith("List")) {
        const type = "List";
        Object.assign(json, {
            type: type,
            name: name,
            scroll: "vertical" // TODO:オプションを取得するようにする
        });
        await funcForEachChild();
        let areaElement = json.elements.find(element => {
            return element.name == "Area";
        });
        if (areaElement != null) {
            console.log("*** found Area ***");
        }
        return type;
    }

    // 通常のグループ
    const type = "Group";
    Object.assign(json, {
        type: type,
        name: name,
        elements: [] // Groupは空でもelementsをもっていないといけない
    });
    assignPivotAndStretch(json, node);
    if (checkOptionRasterize(options)) {}
    await funcForEachChild();
    return type;
}

/**
 * レスポンシブパラメータの取得
 * @param {*} node 
 */
function getPivotAndStretch(node) {
    try {
        let parent = node.parent;
        let parentBounds = parent.boundsInParent;
        let parentTopLeft = parent.topLeftInParent;
        let parentWidth = parentBounds.width;
        let parentHeight = parentBounds.height;

        let horizontalFix = null; // left center right
        let verticalFix = null; // top middle bottom

        let beforeBounds = node.boundsInParent;
        let beforeFontSize = node.fontSize;

        // 親のサイズ変更
        parent.resize(parentWidth + 100, parentHeight + 100);
        //parent.width = parentWidth + 100;
        //parent.height = parentHeight + 100;
        let afterBounds = node.boundsInParent;

        // 親のサイズを元に戻す
        parent.resize(parentWidth, parentHeight);

        // 場合によって､位置がかわってしまうためもとに戻す
        let a = parent.topLeftInParent;
        if (a.x != parentTopLeft.x || a.y != parentTopLeft.y) {
            console.log("*** error changed parent paramaeter");
            try {
                parent.topLeftInParent = parentTopLeft;
            } catch (e) {
                console.log("****** error changed parent paramaeter");
            }
        }

        // 場合によって､フォントサイズが変わるためもとに戻す
        if (beforeFontSize != null && node.fontSize != beforeFontSize) {
            node.fontSize = beforeFontSize;
        }

        // 横のレスポンシブパラメータを取得する
        if (beforeBounds.x == afterBounds.x) {
            horizontalFix = "left";
        } else {
            horizontalFix = (afterBounds.x - beforeBounds.x < 10) ? "center" : "right";
        }

        // 縦のレスポンシブパラメータを取得する
        if (beforeBounds.y == afterBounds.y) {
            verticalFix = "top";
        } else {
            verticalFix = (afterBounds.y - beforeBounds.y < 10) ? "middle" : "bottom";
        }

        let ret = {};

        // 横ストレッチチェック
        if (beforeBounds.width < afterBounds.width) {
            horizontalFix = null; // 縦ストレッチがある場合､pivot情報を消す
            Object.assign(ret, {
                stretchx: true
            })
        }

        // 縦ストレッチチェック
        if (beforeBounds.height < afterBounds.height) {
            verticalFix = null; // 縦ストレッチがある場合､pivot情報を消す
            Object.assign(ret, {
                stretchy: true
            })
        }

        // Pivot出力
        if (horizontalFix != null || verticalFix != null) {
            Object.assign(ret, {
                pivot: (horizontalFix || "") + (verticalFix || "")
            })
        }

        console.log(ret);

        return ret;
    } catch (e) {
        console.log("***error getPivotAndStretch() failed:" + e.message);
    }
    return null;
}


/**
 * テキストレイヤーの処理
 * @param {*} json 
 * @param {scenegraph} node 
 * @param {artboard} artboard 
 * @param {*} subfolder 
 * @param {[]} renditions 
 * @param {string} name 
 * @param {string[]} options 
 */
async function extractedText(json, node, artboard, subfolder, renditions, name, options) {
    // ラスタライズオプションチェック
    if (checkOptionRasterize(options)) {
        await extractedDrawing(json, node, artboard, subfolder, renditions, name, options);
        return;
    }
    const drawBounds = getDrawBoundsInRoot(node, artboard);

    // text.styleRangesの適応をしていない
    Object.assign(json, {
        type: "Text",
        name: name,
        text: node.text,
        textType: "point",
        font: node.fontFamily,
        size: node.fontSize * scale,
        color: getRGB(node.fill.value),
        align: node.textAlign,
        x: drawBounds.x,
        y: drawBounds.y,
        w: drawBounds.width,
        h: drawBounds.height,
        vh: drawBounds.height,
        opacity: 100
    });

    //
    assignPivotAndStretch(json, node);
}


/**
 * パスレイヤー(楕円や長方形等)の処理
 * @param {*} json 
 * @param {scenegraph} node 
 * @param {artboard} artboard 
 * @param {*} subFolder 
 * @param {*} renditions 
 * @param {string} name 
 * @param {string[]} options 
 */
async function extractedDrawing(json, node, artboard, subFolder, renditions, name, options) {
    //
    Object.assign(json, {
        type: "Image",
        name: name,
    });

    // 
    assignPivotAndStretch(json, node);

    await assignImage(json, node, artboard, subFolder, renditions, name);

}


function parseNameOptions(str) {
    let name = null;
    let options = {};
    let optionArray = str.split("@");
    if (optionArray != null && options.length > 0) {
        name = options[0].trim();
        optionArray.shift();
        optionArray.forEach(option => {
            let args = option.split("=");
            if (args > 1) {
                options[args[0].trim()] = args[1].trim();
            } else {
                options[option.trim()] = true;
            }
        })
    } else {
        name = str;
    }
    return {
        name: name,
        options: {}
    };
}

function concatNameOptions(name, options) {
    let str = "" + name;

    for (let key in options) {
        let val = options[key];
        str += "@" + key + "=" + val;
    }

    return str;
}

/**
 * アートボードの処理
 * @param {*} renditions 
 * @param {*} folder 
 * @param {artboard} root 
 */
async function extractedArtboard(renditions, folder, root) {
    let subFolderName = root.name;

    // フォルダ名に使えない文字を'_'に変換
    subFolderName = convertToFileName(subFolderName);

    // アートボード毎にフォルダを作成する
    // TODO:他にやりかたはないだろうか
    try {
        var subFolder = await folder.getEntry(subFolderName);
    } catch (e) {
        subFolder = await folder.createFolder(subFolderName);
    }

    const layoutFileName = subFolderName + ".layouta.txt";
    const layoutFile = await folder.createFile(layoutFileName, {
        overwrite: true
    });

    const rootBounds = getGlobalDrawBounds(root);
    console.log(rootBounds);

    let layoutJson = {
        info: {
            version: "0.6.1",
            canvas: {
                image: {
                    w: rootBounds.width,
                    h: rootBounds.height
                },
                size: {
                    w: rootBounds.width,
                    h: rootBounds.height
                },
                base: {
                    x: 0,
                    y: 0,
                    w: rootBounds.width,
                    h: rootBounds.height
                }
            }
        },
        root: {
            type: "Root",
            name: root.name
        }
    };

    let nodeWalker = async (nodeStack, layoutJson, depth, isRoot) => {
        var node = nodeStack[nodeStack.length - 1];
        let constructorName = node.constructor.name;
        const indent = (depth => {
            let sp = "";
            for (let i = 0; i < depth; i++) sp += "  ";
            return sp;
        })(depth);
        console.log(indent + "'" + node.name + "':" + constructorName);

        // レイヤー名から名前とオプションの分割
        let {
            name,
            options
        } = parseNameOptions(node.name);

        if (isRoot && optionEnableSubPrefab && name.endsWith("/")) {
            name = name.slice(0, -1);
        }

        console.log(node.name, name, options);

        // 名前の最初1文字目での処理分別
        if (name.length > 0) {
            switch (name[0]) {
                case '#':
                    // コメント レイヤー
                    return;
                case '*':
                    // そのレイヤーをラスタライズする
                    options["rasterize"] = true;
                    name = name.substring(1);
                    break;
                default:
                    break;
            }
        }

        // 子Node処理関数
        let forEachChild = async () => {
            const numChildren = node.children.length;
            if (numChildren > 0) {
                layoutJson.elements = [];
                // 後ろから順番に処理をする
                // 描画順に関わるので､非同期処理にしない
                for (let i = numChildren - 1; i >= 0; i--) {
                    let childElement = {};
                    nodeStack.push(node.children.at(i));
                    await nodeWalker(nodeStack, childElement, depth + 1);
                    nodeStack.pop();
                    // なにも入っていない場合はelementsに追加しない
                    if (Object.keys(childElement).length > 0) {
                        layoutJson.elements.push(childElement);
                    }
                }
            }
        }

        // nodeの型で処理の分岐
        switch (constructorName) {
            case "Artboard":
                await forEachChild();
                break;
            case "BooleanGroup":
                {
                    // BooleanGroupは強制的にラスタライズする
                    options["rasterize"] = true;
                    let type = await extractedGroup(layoutJson, node, forEachChild, name, options);
                }
                break;
            case "Group":
            case "RepeatGrid":
            case "SymbolInstance":
                {
                    let type = await extractedGroup(layoutJson, node, forEachChild, name, options);
                }
                break;
            case "Line":
            case "Ellipse":
            case "Rectangle":
            case "Path":
                nodeStack.forEach(node => {});
                await extractedDrawing(layoutJson, node, root, subFolder, renditions, name, options);
                await forEachChild();
                break;
            case "Text":
                await extractedText(layoutJson, node, root, subFolder, renditions, name, options);
                await forEachChild();
                break;
            default:
                console.log("***error type:" + constructorName);
                await forEachChild();
                break;
        }

    };

    await nodeWalker([root], layoutJson.root, 0, true);

    // layout.txtの出力
    layoutFile.write(JSON.stringify(layoutJson, null, "  "));
    console.log(layoutFileName);

}


// メインファンクション
async function exportBaum2(roots, outputFolder) {
    // ラスタライズする要素を入れる
    let renditions = [];

    // アートボード毎の処理
    for (var i = 0; i < roots.length; i++) {
        let artboard = roots[i];
        await extractedArtboard(renditions, outputFolder, artboard);
    }

    if (renditions.length == 0) {
        // 画像出力の必要がなければ終了
        alert("no outputs");
        return;
    }

    // 一括画像ファイル出力
    application.createRenditions(renditions)
        .then(results => {
            results.forEach(result => {
                console.log(`saved at ${result.outputFile.nativePath}`);
            });
        })
        .catch(error => {
            console.log("error:" + error);
        });
}


/**
 * Shorthand for creating Elements.
 * @param {*} tag The tag name of the element.
 * @param {*} [props] Optional props.
 * @param {*} children Child elements or strings
 */
function h(tag, props, ...children) {
    let element = document.createElement(tag);
    if (props) {
        if (props.nodeType || typeof props !== "object") {
            children.unshift(props);
        } else {
            for (let name in props) {
                let value = props[name];
                if (name == "style") {
                    Object.assign(element.style, value);
                } else {
                    element.setAttribute(name, value);
                    element[name] = value;
                }
            }
        }
    }
    for (let child of children) {
        element.appendChild(typeof child === "object" ? child : document.createTextNode(child));
    }
    return element;
}

/**
 * alertの表示
 * @param {string} message 
 */
async function alert(message) {
    let dialog =
        h("dialog",
            h("form", {
                    method: "dialog",
                    style: {
                        width: 400
                    }
                },
                h("h1", "XD Baum2 Export"),
                h("hr"),
                h("span", message),
                h("footer",
                    h("button", {
                        uxpVariant: "primary",
                        onclick(e) {
                            dialog.close()
                        }
                    }, "Close"),
                )
            )
        )
    document.body.appendChild(dialog);
    return await dialog.showModal();
}


async function showModal(selection, root) {
    let inputFolder;
    let inputScale;
    let errorLabel;
    let checkGetResponsiveParameter;
    let checkEnableSubPrefab;
    let dialog =
        h("dialog",
            h("form", {
                    method: "dialog",
                    style: {
                        width: 400
                    }
                },
                h("h1", "XD Baum2 Export"),
                h("hr"),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    h("span", "Folder"),
                    inputFolder = h("input", {
                        style: {
                            width: "60%",
                        },
                        readonly: true,
                        border: 0
                    }),
                    h("button", {
                        async onclick(e) {
                            var folder = await fs.getFolder();
                            if (folder != null) {
                                inputFolder.value = folder.nativePath;
                                outputFolder = folder;
                            }
                        }
                    }, "...")
                ),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    h("span", "Scale"),
                    inputScale = h("input", {
                        value: "4.0"
                    })
                ),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    checkGetResponsiveParameter = h("input", {
                        type: "checkbox"
                    }),
                    h("span", "export responsive parameter (EXPERIMENTAL)")
                ),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    checkEnableSubPrefab = h("input", {
                        type: "checkbox"
                    }),
                    h("span", "名前の最後に/がついている以下を独立したPrefabにする (EXPERIMENTAL)")
                ),
                errorLabel = h("label", {
                        style: {
                            alignItems: "center",
                            color: "#f00"
                        }
                    },
                    ""
                ),
                h("footer",
                    h("button", {
                        uxpVariant: "primary",
                        onclick(e) {
                            dialog.close()
                        }
                    }, "Cancel"),
                    h("button", {
                        uxpVariant: "cta",
                        onclick(e) {
                            // 出力できる状態かチェック
                            // スケールの値が正常か
                            let tmpScale = Number.parseFloat(inputScale.value);
                            if (Number.isNaN(tmpScale)) {
                                errorLabel.textContent = "invalid scale value";
                                return;
                            }
                            scale = tmpScale;
                            // 出力フォルダは設定してあるか
                            if (outputFolder == null) {
                                errorLabel.textContent = "invalid output folder";
                                return;
                            }
                            // レスポンシブパラメータ
                            optionGetResponsiveParameter = checkGetResponsiveParameter.checked;
                            // サブPrefab
                            optionEnableSubPrefab = checkEnableSubPrefab.checed;

                            dialog.close("export");
                        }
                    }, "Export")
                )
            )
        )

    // 出力前にセッションデータをダイアログに反映する
    // Scale
    inputScale.value = scale;
    // Folder
    inputFolder.value = "";
    if (outputFolder != null) {
        inputFolder.value = outputFolder.nativePath;
    }
    // Responsive Parameter
    checkGetResponsiveParameter.checked = optionGetResponsiveParameter;
    checkEnableSubPrefab.checked = optionEnableSubPrefab;

    // Dialog表示
    document.body.appendChild(dialog);
    let result = await dialog.showModal();

    // Dialogの結果チェック
    if (result == "export") {
        let roots = [];

        // 選択されているものがない場合 全てが変換対象
        let searchItems = selection.items.length > 0 ? selection.items : root.children

        let func = nodes => {
            nodes.forEach(node => {
                if (node instanceof Artboard || (optionEnableSubPrefab && parseNameOptions(node.name).name.endsWith("/"))) {
                    console.log("push");
                    roots.push(node);
                }
                var children = node.children;
                if (children) func(children);
            });
        }

        func(searchItems);

        if (roots.length == 0) {
            // 出力するものが見つからなかった
            alert("no selected artboards.")
            return;
        }

        await exportBaum2(roots, outputFolder);
    }

}


async function pivot(selection, root) {
    console.log("pivot");
    var node = selection.items[0];

    console.log(node.root.x);
    console.log(node.globalBounds);
    console.log(node.globalDrawBounds);
    console.log(node.localBounds);

    return;


    if (node == null || !node.isContainer) {
        alert("select group");
        return;
    }


    node.name = "aaaa";
    node.children.forEach(child => {
        let {
            name,
            options
        } = parseNameOptions(child.name);
        var pivot = getPivotAndStretch(child);
        Object.assign(options, pivot);
        name = concatNameOptions(name, options);
        console.log(name);
        //child.name = "hello";
        //child.name = name;
    });
}


module.exports = { // コマンドIDとファンクションの紐付け
    commands: {
        baum2ExportCommand: showModal,
        baum2PivotCommand: pivot
    }
};