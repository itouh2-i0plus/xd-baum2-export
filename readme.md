## Unityでのモック作成にAdobeXDを利用したい

AdobeXDでの作成
![キャプチャ.PNG](https://qiita-image-store.s3.amazonaws.com/0/350704/0a97880b-259e-3eb1-8a47-525f2467dd04.png)

Unity Prefab化
![キャプチャ.PNG](https://qiita-image-store.s3.amazonaws.com/0/350704/45832958-4e27-45c6-b40b-7bde0b79e69b.png)

プラグイン開発GitHub
https://github.com/itouh2-i0plus/xd-baum2-export/

解説記事(Qiita)
https://qiita.com/itouh2-i0plus/items/6a948aa40acada879ce7

## プラグイン更新履歴

|日付|内容|更新者|
|---|---|---|
|2019/01/28|初稿|@itouh2-i0plus|
|2019/01/29|出力ファイル名に空白を許可|@itouh2-i0plus|
|2019/01/29|リピートグリッド仮対応 パスの出力追加|@itouh2-i0plus|
|2019/02/03|シンボル仮対応|@itouh2-i0plus|

## インストール

### Baum2のインストール

AdobeXDプラグインは､[Baum2](https://github.com/kyubuns/Baum2)用の中間ファイルを出力します
[Baum2](https://github.com/kyubuns/Baum2)をご確認ください
Unity用プラグインのインストールが必要です

### AdobeXDプラグイン export Baum2のインストール･実行方法

こちらにわかりやすいインストール記事があります([CGMETHOD - すいみんさん](https://www.cg-method.com/) ありがとうございます)
[【AdobeXD】Baum2形式で書き出してUnityで画面を再現する方法](https://www.cg-method.com/entry/adobexd-plugins-baum2-unity/)

1. AdobeXDを開く
2. ｢メニュー > プラグイン > 開発版 > 開発フォルダーを表示｣
3. プラグイン用フォルダ｢xd-baum2-export｣を作成する
4. [プラグイン開発GitHub](https://github.com/itouh2-i0plus/xd-baum2-export/)からファイルをダウンロード(manifest.json と main.jsの2ファイル)
5. フォルダ｢xd-baum2-export｣にコピー
6. ｢メニュー > プラグイン > 開発版 > プラグインを再読み込み｣これにより実行できるようになります
7. ｢メニュー > プラグイン > 開発版 > baum2 export｣
    * 選択されたアートボードが出力対象になります
    * なにも選択されてなければ､全てのアートボードが出力対象になります
    * アートボード毎に､XXX.layout.txtファイルとフォルダが作成されます
8. 出力されたファイルとフォルダを　Unity Projectウィンドウ､Assets/Baum2/Importにドラッグ&ドロップ
    * 出力フォルダをAssets/Baum2/Importにしておくとドラッグ&ドロップ不要
9. Assets/Baum2/Sample/PrefabsにPrefabが出力され､Assets/Baum2/Sample/Spritesに画像が出力されます

## 困った時

* Unity上で文字が出ない
    * Fontファイルが無いのではないでしょうか
    * Assets/Baum2/Sample/Fontsフォルダにフォントファイル(TTFまたはOTFファイル)をいれてください
* Unityにもってきたとき､ボタンにならない
    * レイヤー構造を確認してください [Baum2](https://github.com/kyubuns/Baum2)に準拠しています
    * このページ冒頭のスクリーンショットも参考になるかと思います
* レイヤーの階層を意識して､XDを触ったことがない
    * Windowsの場合はCtrl+Yでレイヤーウィンドウがでます それを見ながらの作業がやりやすいと思います
* ショートカットキーを登録したい 変更したい
    * manifest.jsonのshortcutを編集してください

## 改良したいところ

- [ ] 出力画像ファイル名をBaum2と同じにしたい
- [ ] 出力スケールの変更
    * 現状4倍固定
- [ ] シンプルなレイヤー構造でも出力できるように
    * もっとサクサクつくれるようにしたい
- [ ] ｢レスポンシブサイズ変更｣の設定を活かしたい
    * "@Pivot=" といったレイヤー名での設定でなくともできるように
- [x] リピートグリッド対応
- [x] シンボル対応
- [x] レイヤー名の最初に'*'がついている場合､ラスタライズする
- [ ] リンクが設定してあるオブジェクトはボタンにしたい
- [ ] Textはラスタライズして､Unityに渡してもいいかもしれない

## 参考

* [[Unity] psdからUIを作るライブラリ"Baum2"公開しました - Qiita](https://qiita.com/kyubuns/items/b4c0c92e60754a8dc544)
    * Baum2の方針､レイヤーの作成の方法､自動9Slice等､こちらの内容が当プラグインの基礎になります
    * この記事から､[Baum2の最新版](https://github.com/kyubuns/Baum2)は進化しています
        * Listのスクロール方向の指定 (XXXList@Scroll=Vertical)
        * Toggleコンポーネント対応
* [【AdobeXD】Baum2形式で書き出してUnityで画面を再現する方法](https://www.cg-method.com/entry/adobexd-plugins-baum2-unity/)
    * わかりやすいインストールの方法をご紹介してくださっています

## 謝辞

[Baum2](https://github.com/kyubuns/Baum2)あってこそです　 [@kyubuns](https://qiita.com/kyubuns) さん ありがとうございます
