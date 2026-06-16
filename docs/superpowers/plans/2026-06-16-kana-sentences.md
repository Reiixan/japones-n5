# Kana Sentences — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Lectura de oraciones" mode to the hiragana and katakana menus that drills sentence reading with a two-step exercise (write romaji → choose Spanish meaning) and automatic SRS-based level progression.

**Architecture:** New `data/kana-sentences.json` (85 curated sentences/texts across 3 levels × 2 decks) feeds a new `js/kana/kana-sentences.js` module. The module computes the unlocked level from SRS state, passes an appropriately filtered pool to `startExercise`, and manages a custom two-step `renderInput` (romaji typing + MC) for levels 1-2; level 3 texts are MC-only. Three existing files need small edits: `app.js` (route), `home.js` (menu entry), `stats.js` (deck entries + filter).

**Tech Stack:** Vanilla ES modules, `js/exercise.js` motor, `js/srs.js` (selectSession / pickWrong), `js/storage.js?v=2` (getProgress), `js/tts.js` (speak / renderSpeakButton / attachSpeakHandler / isAutoOn), `css/exercise.css`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `data/kana-sentences.json` | Pool completo de 85 ítems (2 decks × 3 niveles) |
| Create | `js/kana/kana-sentences.js` | Módulo del modo: gate SRS, two-step renderInput |
| Modify | `css/exercise.css` | Clases: `.kana-sentence-display`, `.romaji-feedback`, `.romaji-fb-ok/err`, `.level-progress` |
| Modify | `js/app.js` | Import + ruta `seg2 === 'sentences'` |
| Modify | `js/home.js` | Entrada "Lectura" en MODES de `renderKanaMenu` |
| Modify | `js/stats.js` | 2 entradas en DECKS + soporte de `.filter` en el loop |

---

## Task 1: Crear `data/kana-sentences.json`

**Files:**
- Create: `data/kana-sentences.json`

Schema de cada ítem: `{ "id": string, "deck": "hiragana"|"katakana", "level": 1|2|3, "jp": string, "es": string, "romaji": string }`.
- `jp` nivel 3: frases separadas por `\n` (se renderizan como `<br>`).
- `romaji` sin puntuación final; Hepburn estricto (を → "wo", じ → "ji").
- Todo el léxico dentro de lo que cubre N5 (vocab, partículas, gramática básica).

- [ ] **Crear el fichero con el siguiente contenido exacto:**

```json
[
  {"id":"ks001","deck":"hiragana","level":1,"jp":"おちゃをのみます。","es":"Bebo té.","romaji":"ocha wo nomimasu"},
  {"id":"ks002","deck":"hiragana","level":1,"jp":"みずをのみます。","es":"Bebo agua.","romaji":"mizu wo nomimasu"},
  {"id":"ks003","deck":"hiragana","level":1,"jp":"たまごをたべます。","es":"Como huevos.","romaji":"tamago wo tabemasu"},
  {"id":"ks004","deck":"hiragana","level":1,"jp":"ごはんをたべます。","es":"Como arroz.","romaji":"gohan wo tabemasu"},
  {"id":"ks005","deck":"hiragana","level":1,"jp":"わたしはがくせいです。","es":"Soy estudiante.","romaji":"watashi wa gakusei desu"},
  {"id":"ks006","deck":"hiragana","level":1,"jp":"これはほんです。","es":"Esto es un libro.","romaji":"kore wa hon desu"},
  {"id":"ks007","deck":"hiragana","level":1,"jp":"あれはなんですか。","es":"¿Qué es aquello?","romaji":"are wa nan desu ka"},
  {"id":"ks008","deck":"hiragana","level":1,"jp":"やまがおおきいです。","es":"La montaña es grande.","romaji":"yama ga ookii desu"},
  {"id":"ks009","deck":"hiragana","level":1,"jp":"そらがあおいです。","es":"El cielo es azul.","romaji":"sora ga aoi desu"},
  {"id":"ks010","deck":"hiragana","level":1,"jp":"はながきれいです。","es":"Las flores son bonitas.","romaji":"hana ga kirei desu"},
  {"id":"ks011","deck":"hiragana","level":1,"jp":"いぬがかわいいです。","es":"El perro es adorable.","romaji":"inu ga kawaii desu"},
  {"id":"ks012","deck":"hiragana","level":1,"jp":"ねこがいます。","es":"Hay un gato.","romaji":"neko ga imasu"},
  {"id":"ks013","deck":"hiragana","level":1,"jp":"がっこうへいきます。","es":"Voy al colegio.","romaji":"gakkou e ikimasu"},
  {"id":"ks014","deck":"hiragana","level":1,"jp":"うちにいます。","es":"Estoy en casa.","romaji":"uchi ni imasu"},
  {"id":"ks015","deck":"hiragana","level":1,"jp":"きょうはさむいです。","es":"Hoy hace frío.","romaji":"kyou wa samui desu"},
  {"id":"ks016","deck":"hiragana","level":1,"jp":"きのうはあつかったです。","es":"Ayer hacía calor.","romaji":"kinou wa atsukatta desu"},
  {"id":"ks017","deck":"hiragana","level":1,"jp":"おかあさんはせんせいです。","es":"La madre es profesora.","romaji":"okaasan wa sensei desu"},
  {"id":"ks018","deck":"hiragana","level":1,"jp":"わたしはにほんごがすきです。","es":"Me gusta el japonés.","romaji":"watashi wa nihongo ga suki desu"},
  {"id":"ks019","deck":"hiragana","level":1,"jp":"まいにちにほんごをべんきょうします。","es":"Estudio japonés todos los días.","romaji":"mainichi nihongo wo benkyou shimasu"},
  {"id":"ks020","deck":"hiragana","level":1,"jp":"ともだちがいます。","es":"Tengo un amigo.","romaji":"tomodachi ga imasu"},
  {"id":"ks021","deck":"hiragana","level":1,"jp":"おはようございます。","es":"Buenos días.","romaji":"ohayou gozaimasu"},
  {"id":"ks022","deck":"hiragana","level":1,"jp":"ありがとうございます。","es":"Muchas gracias.","romaji":"arigatou gozaimasu"},
  {"id":"ks023","deck":"hiragana","level":1,"jp":"すみません。","es":"Disculpe.","romaji":"sumimasen"},
  {"id":"ks024","deck":"hiragana","level":1,"jp":"げんきですか。","es":"¿Cómo estás?","romaji":"genki desu ka"},
  {"id":"ks025","deck":"hiragana","level":1,"jp":"なにをしますか。","es":"¿Qué hace?","romaji":"nani wo shimasu ka"},
  {"id":"ks026","deck":"hiragana","level":2,"jp":"がっこうへいって、にほんごをべんきょうします。","es":"Voy al colegio y estudio japonés.","romaji":"gakkou e itte, nihongo wo benkyou shimasu"},
  {"id":"ks027","deck":"hiragana","level":2,"jp":"てをあらってから、たべます。","es":"Después de lavarme las manos, como.","romaji":"te wo aratte kara, tabemasu"},
  {"id":"ks028","deck":"hiragana","level":2,"jp":"あさおきてから、ごはんをたべます。","es":"Después de levantarme, desayuno.","romaji":"asa okite kara, gohan wo tabemasu"},
  {"id":"ks029","deck":"hiragana","level":2,"jp":"ねむいですが、べんきょうします。","es":"Tengo sueño pero estudio.","romaji":"nemui desu ga, benkyou shimasu"},
  {"id":"ks030","deck":"hiragana","level":2,"jp":"にほんごがすきだから、まいにちべんきょうします。","es":"Como me gusta el japonés, lo estudio todos los días.","romaji":"nihongo ga suki dakara, mainichi benkyou shimasu"},
  {"id":"ks031","deck":"hiragana","level":2,"jp":"びょうきだから、がっこうをやすみます。","es":"Estoy enfermo, así que falto al colegio.","romaji":"byouki dakara, gakkou wo yasumimasu"},
  {"id":"ks032","deck":"hiragana","level":2,"jp":"うちにかえってから、てをあらいます。","es":"Al volver a casa, me lavo las manos.","romaji":"uchi ni kaette kara, te wo araimasu"},
  {"id":"ks033","deck":"hiragana","level":2,"jp":"しゅくだいをしてから、ほんをよみます。","es":"Después de hacer los deberes, leo el libro.","romaji":"shukudai wo shite kara, hon wo yomimasu"},
  {"id":"ks034","deck":"hiragana","level":2,"jp":"ともだちとでかけて、たのしかったです。","es":"Salí con un amigo y fue divertido.","romaji":"tomodachi to dekakete, tanoshikatta desu"},
  {"id":"ks035","deck":"hiragana","level":2,"jp":"はやくいったほうがいいですよ。","es":"Es mejor que vayas rápido.","romaji":"hayaku itta hou ga ii desu yo"},
  {"id":"ks036","deck":"hiragana","level":2,"jp":"もっとゆっくりはなしてください。","es":"Por favor, hable más despacio.","romaji":"motto yukkuri hanashite kudasai"},
  {"id":"ks037","deck":"hiragana","level":2,"jp":"ここにすわって、まってください。","es":"Siéntese aquí y espere, por favor.","romaji":"koko ni suwatte, matte kudasai"},
  {"id":"ks038","deck":"hiragana","level":2,"jp":"いそがしいから、あしたにしましょう。","es":"Como estoy ocupado, dejémoslo para mañana.","romaji":"isogashii kara, ashita ni shimashou"},
  {"id":"ks039","deck":"hiragana","level":2,"jp":"ほんをよんでいますが、むずかしいです。","es":"Estoy leyendo un libro, pero es difícil.","romaji":"hon wo yonde imasu ga, muzukashii desu"},
  {"id":"ks040","deck":"hiragana","level":2,"jp":"おんがくをきながら、べんきょうします。","es":"Estudio mientras escucho música.","romaji":"ongaku wo kikinagara, benkyou shimasu"},
  {"id":"ks041","deck":"hiragana","level":2,"jp":"でんしゃにのって、えきへいきます。","es":"Subo al tren y voy a la estación.","romaji":"densha ni notte, eki e ikimasu"},
  {"id":"ks042","deck":"hiragana","level":2,"jp":"きのうともだちにあって、おちゃをのみました。","es":"Ayer me encontré con un amigo y tomé té.","romaji":"kinou tomodachi ni atte, ocha wo nomimashita"},
  {"id":"ks043","deck":"hiragana","level":2,"jp":"すしがすきですが、さかなはきらいです。","es":"Me gusta el sushi, pero no me gusta el pescado.","romaji":"sushi ga suki desu ga, sakana wa kirai desu"},
  {"id":"ks044","deck":"hiragana","level":2,"jp":"なにかたべたいですが、なにもありません。","es":"Quiero comer algo, pero no hay nada.","romaji":"nanika tabetai desu ga, nani mo arimasen"},
  {"id":"ks045","deck":"hiragana","level":2,"jp":"まいあさはをみがいてから、がっこうへいきます。","es":"Cada mañana, después de cepillarme los dientes, voy al colegio.","romaji":"mai asa ha wo migaite kara, gakkou e ikimasu"},
  {"id":"ks046","deck":"hiragana","level":3,"jp":"わたしはたなかです。\nにほんのがくせいです。\nまいにちにほんごをべんきょうしています。","es":"Me llamo Tanaka. Soy estudiante japonés. Estudio japonés todos los días.","romaji":"watashi wa tanaka desu. nihon no gakusei desu. mainichi nihongo wo benkyou shite imasu."},
  {"id":"ks047","deck":"hiragana","level":3,"jp":"きょうはいいてんきです。\nそらがあおくて、きれいです。\nこうえんへいきたいです。","es":"Hoy hace buen tiempo. El cielo es azul y bonito. Quiero ir al parque.","romaji":"kyou wa ii tenki desu. sora ga aokute, kirei desu. koueen e ikitai desu."},
  {"id":"ks048","deck":"hiragana","level":3,"jp":"まいあさ、ろくじにおきます。\nかおをあらってから、あさごはんをたべます。\nそして、がっこうへいきます。","es":"Cada mañana, me levanto a las seis. Después de lavarme la cara, desayuno. Y luego voy al colegio.","romaji":"mai asa, rokuji ni okimasu. kao wo aratte kara, asa gohan wo tabemasu. soshite, gakkou e ikimasu."},
  {"id":"ks049","deck":"hiragana","level":3,"jp":"わたしのかぞくはよにんです。\nちち、はは、あに、そしてわたしです。\nちちはまいにちはたらいています。\nはははせんせいです。","es":"Mi familia somos cuatro. Mi padre, mi madre, mi hermano mayor y yo. Mi padre trabaja todos los días. Mi madre es profesora.","romaji":"watashi no kazoku wa yonin desu. chichi, haha, ani, soshite watashi desu. chichi wa mainichi hataraite imasu. haha wa sensei desu."},
  {"id":"ks050","deck":"hiragana","level":3,"jp":"きのう、みせへいきました。\nやさいとにくをかいました。\nぜんぶでせんえんでした。","es":"Ayer fui a la tienda. Compré verduras y carne. En total fueron mil yenes.","romaji":"kinou, mise e ikimashita. yasai to niku wo kaimashita. zenbu de sen en deshita."},
  {"id":"ks051","deck":"hiragana","level":3,"jp":"わたしはにほんごをべんきょうしています。\nむずかしいですが、おもしろいです。\nまいにちすこしずつれんしゅうします。","es":"Estoy estudiando japonés. Es difícil pero interesante. Cada día practico poco a poco.","romaji":"watashi wa nihongo wo benkyou shite imasu. muzukashii desu ga, omoshiroi desu. mainichi sukoshi zutsu renshuu shimasu."},
  {"id":"ks052","deck":"hiragana","level":3,"jp":"としょかんへいきました。\nほんをさんさつかりました。\nいえでよみます。","es":"Fui a la biblioteca. Tomé prestados tres libros. Los leeré en casa.","romaji":"toshokan e ikimashita. hon wo san satsu karimashita. ie de yomimasu."},
  {"id":"ks053","deck":"hiragana","level":3,"jp":"きょうはいそがしいです。\nあさからばんまではたらきます。\nよるはゆっくりやすみます。","es":"Hoy estoy ocupado. Trabajo desde la mañana hasta la noche. Por la noche descanso tranquilamente.","romaji":"kyou wa isogashii desu. asa kara ban made hatarakimasu. yoru wa yukkuri yasumimasu."},
  {"id":"ks054","deck":"hiragana","level":3,"jp":"がっこうのちかくにみせがあります。\nそこでひるごはんをたべます。\nやすくておいしいです。","es":"Cerca del colegio hay una tienda. Allí como el almuerzo. Es barato y delicioso.","romaji":"gakkou no chikaku ni mise ga arimasu. soko de hiru gohan wo tabemasu. yasukute oishii desu."},
  {"id":"ks055","deck":"hiragana","level":3,"jp":"なつはあついです。\nうみへいきたいです。\nともだちといっしょにおよぎます。","es":"El verano es caluroso. Quiero ir al mar. Nadaré junto con mis amigos.","romaji":"natsu wa atsui desu. umi e ikitai desu. tomodachi to issho ni oyogimasu."},
  {"id":"ks056","deck":"katakana","level":1,"jp":"コーヒーをのみます。","es":"Bebo café.","romaji":"koohii wo nomimasu"},
  {"id":"ks057","deck":"katakana","level":1,"jp":"アイスクリームをたべます。","es":"Como helado.","romaji":"aisukuriimu wo tabemasu"},
  {"id":"ks058","deck":"katakana","level":1,"jp":"バスにのります。","es":"Subo al autobús.","romaji":"basu ni norimasu"},
  {"id":"ks059","deck":"katakana","level":1,"jp":"テレビをみます。","es":"Veo la televisión.","romaji":"terebi wo mimasu"},
  {"id":"ks060","deck":"katakana","level":1,"jp":"ラジオをききます。","es":"Escucho la radio.","romaji":"rajio wo kikimasu"},
  {"id":"ks061","deck":"katakana","level":1,"jp":"ノートにかきます。","es":"Escribo en el cuaderno.","romaji":"nooto ni kakimasu"},
  {"id":"ks062","deck":"katakana","level":1,"jp":"スーパーへいきます。","es":"Voy al supermercado.","romaji":"suupaa e ikimasu"},
  {"id":"ks063","deck":"katakana","level":1,"jp":"ジュースがすきです。","es":"Me gusta el zumo.","romaji":"juusu ga suki desu"},
  {"id":"ks064","deck":"katakana","level":1,"jp":"テニスをします。","es":"Juego al tenis.","romaji":"tenisu wo shimasu"},
  {"id":"ks065","deck":"katakana","level":1,"jp":"カメラをもっています。","es":"Tengo una cámara.","romaji":"kamera wo motte imasu"},
  {"id":"ks066","deck":"katakana","level":1,"jp":"アパートにすんでいます。","es":"Vivo en un apartamento.","romaji":"apaato ni sunde imasu"},
  {"id":"ks067","deck":"katakana","level":1,"jp":"レストランでたべます。","es":"Como en el restaurante.","romaji":"resutoran de tabemasu"},
  {"id":"ks068","deck":"katakana","level":1,"jp":"インターネットをつかいます。","es":"Uso internet.","romaji":"intaanetto wo tsukaimasu"},
  {"id":"ks069","deck":"katakana","level":1,"jp":"プールでおよぎます。","es":"Nado en la piscina.","romaji":"puuru de oyogimasu"},
  {"id":"ks070","deck":"katakana","level":1,"jp":"ピアノをひきます。","es":"Toco el piano.","romaji":"piano wo hikimasu"},
  {"id":"ks071","deck":"katakana","level":2,"jp":"バスとタクシーではどちらがはやいですか。","es":"¿Cuál es más rápido, el autobús o el taxi?","romaji":"basu to takushii de wa dochira ga hayai desu ka"},
  {"id":"ks072","deck":"katakana","level":2,"jp":"スーパーでジュースとパンをかいました。","es":"Compré zumo y pan en el supermercado.","romaji":"suupaa de juusu to pan wo kaimashita"},
  {"id":"ks073","deck":"katakana","level":2,"jp":"テレビをみてから、ねます。","es":"Después de ver la televisión, me duermo.","romaji":"terebi wo mite kara, nemasu"},
  {"id":"ks074","deck":"katakana","level":2,"jp":"アパートのちかくにレストランがあります。","es":"Cerca del apartamento hay un restaurante.","romaji":"apaato no chikaku ni resutoran ga arimasu"},
  {"id":"ks075","deck":"katakana","level":2,"jp":"コーヒーがすきですが、ジュースもすきです。","es":"Me gusta el café, pero también me gusta el zumo.","romaji":"koohii ga suki desu ga, juusu mo suki desu"},
  {"id":"ks076","deck":"katakana","level":2,"jp":"テニスをしてから、シャワーをあびます。","es":"Después de jugar al tenis, me ducho.","romaji":"tenisu wo shite kara, shawaa wo abimasu"},
  {"id":"ks077","deck":"katakana","level":2,"jp":"ノートにかいてから、おぼえます。","es":"Después de escribirlo en el cuaderno, lo memorizo.","romaji":"nooto ni kaite kara, oboemasu"},
  {"id":"ks078","deck":"katakana","level":2,"jp":"インターネットでニュースをよみます。","es":"Leo las noticias en internet.","romaji":"intaanetto de nyuusu wo yomimasu"},
  {"id":"ks079","deck":"katakana","level":2,"jp":"レストランでたべてから、コーヒーをのみました。","es":"Después de comer en el restaurante, tomé café.","romaji":"resutoran de tabete kara, koohii wo nomimashita"},
  {"id":"ks080","deck":"katakana","level":2,"jp":"バスでいくか、タクシーでいくか、まだきめていません。","es":"Aún no he decidido si ir en autobús o en taxi.","romaji":"basu de iku ka, takushii de iku ka, mada kimete imasen"},
  {"id":"ks081","deck":"katakana","level":3,"jp":"スーパーへかいものにいきました。\nやさいとくだものとジュースをかいました。\nぜんぶでにせんえんでした。","es":"Fui de compras al supermercado. Compré verduras, fruta y zumo. En total fueron dos mil yenes.","romaji":"suupaa e kaimono ni ikimashita. yasai to kudamono to juusu wo kaimashita. zenbu de nisen en deshita."},
  {"id":"ks082","deck":"katakana","level":3,"jp":"わたしはテレビがすきです。\nまいにちみます。\nニュースやえいがをみます。","es":"Me gusta la televisión. La veo todos los días. Veo noticias y películas.","romaji":"watashi wa terebi ga suki desu. mainichi mimasu. nyuusu ya eiga wo mimasu."},
  {"id":"ks083","deck":"katakana","level":3,"jp":"このアパートはえきのちかくにあります。\nバスていもあります。\nとてもべんりなところです。","es":"Este apartamento está cerca de la estación. También hay una parada de autobús. Es un lugar muy conveniente.","romaji":"kono apaato wa eki no chikaku ni arimasu. basu tei mo arimasu. totemo benri na tokoro desu."},
  {"id":"ks084","deck":"katakana","level":3,"jp":"きのうレストランへいきました。\nともだちといっしょにたべました。\nとてもおいしかったです。\nまたいきたいです。","es":"Ayer fui a un restaurante. Comí junto con un amigo. Estaba muy delicioso. Quiero volver.","romaji":"kinou resutoran e ikimashita. tomodachi to issho ni tabemashita. totemo oishikatta desu. mata ikitai desu."},
  {"id":"ks085","deck":"katakana","level":3,"jp":"テニスがすきです。\nまいしゅうプールにもいきます。\nスポーツはたのしいです。\nけんこうにもいいです。","es":"Me gusta el tenis. También voy a la piscina cada semana. El deporte es divertido. También es bueno para la salud.","romaji":"tenisu ga suki desu. mai shuu puuru ni mo ikimasu. supootsu wa tanoshii desu. kenkou ni mo ii desu."}
]
```

- [ ] **Commit:**

```bash
git add data/kana-sentences.json
git commit -m "data: añadir kana-sentences.json (85 ítems, 3 niveles, hiragana+katakana)"
```

---

## Task 2: Crear `js/kana/kana-sentences.js`

**Files:**
- Create: `js/kana/kana-sentences.js`

- [ ] **Crear el fichero con el siguiente contenido:**

```js
import { startExercise, showSessionConfig } from '../exercise.js';
import { selectSession, pickWrong } from '../srs.js';
import { getProgress } from '../storage.js?v=2';
import { speak, renderSpeakButton, attachSpeakHandler, isAutoOn } from '../tts.js';

const DECK_PREFIX = 'kana-sentences';
const LEVEL_NAMES = ['', 'Oraciones simples', 'Oraciones complejas', 'Textos cortos'];
const GATE = 0.8;

function getDeckId(deck) {
  return `${DECK_PREFIX}-${deck}`;
}

function unlockedLevel(deckId, items) {
  for (let lvl = 1; lvl <= 2; lvl++) {
    const group = items.filter(i => i.level === lvl);
    if (group.length === 0) continue;
    const mastered = group.filter(i => (getProgress(deckId, i.id).box ?? 0) >= 3).length;
    if (mastered / group.length < GATE) return lvl;
  }
  return 3;
}

function buildSubtitle(deckId, items, currentLevel) {
  if (currentLevel >= 3) return `Nivel 3 — Textos cortos · Nivel máximo alcanzado ✓`;
  const group = items.filter(i => i.level === currentLevel);
  const mastered = group.filter(i => (getProgress(deckId, i.id).box ?? 0) >= 3).length;
  const total = group.length;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const filled = Math.round(pct / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  return `Nivel actual: ${currentLevel} — ${LEVEL_NAMES[currentLevel]}<br><span class="level-progress">${bar} ${mastered}/${total} dominadas → nivel ${currentLevel + 1}</span>`;
}

export async function start(container, deck, allSentences) {
  const deckId = getDeckId(deck);
  const deckItems = allSentences.filter(i => i.deck === deck);
  const level = unlockedLevel(deckId, deckItems);
  const available = deckItems.filter(i => i.level <= level);

  showSessionConfig(container, {
    title: 'Lectura de oraciones',
    subtitle: buildSubtitle(deckId, deckItems, level),
    onStart: (size) => runSentences(container, deckId, available, size),
  });
}

function runSentences(container, deckId, available, size) {
  startExercise(container, {
    deck: deckId,
    getItems: () => selectSession(deckId, available, size),
    allItems: available,
    getItemId: it => it.id,
    renderPrompt(item, el) {
      const jpHtml = item.jp.replace(/\n/g, '<br>');
      el.innerHTML = `<div class="kana-sentence-display">${jpHtml}</div>${renderSpeakButton(item.jp)}`;
      attachSpeakHandler(el);
      if (isAutoOn()) speak(item.jp);
    },
    renderInput(item, all, el, onAnswer) {
      return item.level === 3
        ? renderMcOnly(item, all, el, onAnswer)
        : renderTwoStep(item, all, el, onAnswer);
    },
    checkAnswer(item, answer) {
      return answer === item.es;
    },
    getCorrectDisplay(item) {
      return item.es;
    },
    getPromptSpeechText: item => item.jp,
    getAnswerSpeechText: item => item.jp,
    menuPath: `/${deck}`,
  });
}

// ── helpers ────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildMcHtml(all, item) {
  const wrongs = pickWrong(all, item, it => it.es, 3);
  return shuffle([item, ...wrongs])
    .map((opt, i) => `<button class="choice-btn" data-val="${esc(opt.es)}" data-key="${i + 1}"><span class="choice-key">${i + 1}</span>${esc(opt.es)}</button>`)
    .join('');
}

function attachMcListeners(el, onSelect) {
  const keyHandler = e => {
    const n = parseInt(e.key);
    if (n >= 1 && n <= 4) {
      const btn = el.querySelector(`[data-key="${n}"]`);
      if (btn && !btn.disabled) btn.click();
    }
  };
  document.addEventListener('keydown', keyHandler);

  const clickHandler = e => {
    const btn = e.target.closest('.choice-btn');
    if (!btn || btn.disabled) return;
    el.removeEventListener('click', clickHandler);
    document.removeEventListener('keydown', keyHandler);
    onSelect(btn.dataset.val);
  };
  el.addEventListener('click', clickHandler);

  return () => {
    el.removeEventListener('click', clickHandler);
    document.removeEventListener('keydown', keyHandler);
  };
}

// ── level-3: MC only ──────────────────────────────────────────

function renderMcOnly(item, all, el, onAnswer) {
  el.innerHTML = `<div class="choice-grid">${buildMcHtml(all, item)}</div>`;
  return attachMcListeners(el, onAnswer);
}

// ── levels 1-2: romaji → MC ───────────────────────────────────

function renderTwoStep(item, all, el, onAnswer) {
  let romajiCorrect = false;
  let phase2Cleanup = null;

  el.innerHTML = `
    <form class="typing-form" autocomplete="off">
      <input class="typing-input" type="text" placeholder="romaji..." spellcheck="false" autocorrect="off" autocapitalize="off">
      <button type="submit" class="btn-primary">Comprobar</button>
    </form>
  `;
  const form = el.querySelector('.typing-form');
  el.querySelector('.typing-input').focus();

  const submitHandler = e => {
    e.preventDefault();
    const val = form.querySelector('.typing-input').value.trim().toLowerCase();
    if (!val) return;

    romajiCorrect = val === item.romaji.toLowerCase();
    const fbClass = romajiCorrect ? 'romaji-fb-ok' : 'romaji-fb-err';
    const fbText = romajiCorrect ? `✓ ${item.romaji}` : `✗ Era: ${item.romaji}`;

    el.innerHTML = `<div class="romaji-feedback ${fbClass}">${fbText}</div><div class="choice-grid">${buildMcHtml(all, item)}</div>`;

    phase2Cleanup = attachMcListeners(el, selectedVal => {
      const meaningCorrect = selectedVal === item.es;
      onAnswer(romajiCorrect && meaningCorrect ? item.es : '__wrong__');
    });
  };

  form.addEventListener('submit', submitHandler);

  return () => {
    form.removeEventListener('submit', submitHandler);
    if (phase2Cleanup) phase2Cleanup();
  };
}
```

- [ ] **Commit:**

```bash
git add js/kana/kana-sentences.js
git commit -m "feat: añadir módulo kana-sentences con gate SRS y ejercicio de dos pasos"
```

---

## Task 3: Añadir CSS en `css/exercise.css`

**Files:**
- Modify: `css/exercise.css` (append al final del fichero)

- [ ] **Añadir al final de `css/exercise.css`:**

```css
/* === Kana sentences: display de oración/texto === */
.kana-sentence-display {
  font-family: var(--font-jp);
  font-size: clamp(1.2rem, 4vw, 1.7rem);
  line-height: 2;
  text-align: center;
  font-weight: 400;
}

/* Feedback inline del paso romaji (antes del MC) */
.romaji-feedback {
  padding: .45rem .8rem;
  border-radius: .5rem;
  font-size: .95rem;
  margin-bottom: .75rem;
  text-align: center;
  font-family: var(--font-jp);
}
.romaji-fb-ok  { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.romaji-fb-err { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
[data-theme="dark"] .romaji-fb-ok  { background: #14532d; color: #bbf7d0; border-color: #166534; }
[data-theme="dark"] .romaji-fb-err { background: #7f1d1d; color: #fecaca; border-color: #991b1b; }

/* Barra de progreso de nivel en subtitle del config */
.level-progress {
  font-size: .82rem;
  font-family: monospace;
  color: var(--text-muted);
  display: block;
  margin-top: .25rem;
}
```

- [ ] **Commit:**

```bash
git add css/exercise.css
git commit -m "style: clases CSS para kana-sentences (sentence display, romaji feedback, level progress)"
```

---

## Task 4: Integrar en `js/app.js`

**Files:**
- Modify: `js/app.js`

- [ ] **Añadir import al inicio del fichero, junto a los demás imports de kana (después de la línea `import { start as startKanaFlash } ...`):**

```js
import { start as startKanaSentences } from './kana/kana-sentences.js';
```

- [ ] **Añadir rama en el bloque `else if (seg2 === 'words')` del routing de hiragana/katakana. La sección relevante actualmente termina así:**

```js
        else if (seg2 === 'words') {
          const vocabItems = await loadData('vocab-n5.json');
          await startKanaWords(container, deck, vocabItems);
        }
        else window.navigate(`/${deck}`);
```

Reemplazar por:

```js
        else if (seg2 === 'words') {
          const vocabItems = await loadData('vocab-n5.json');
          await startKanaWords(container, deck, vocabItems);
        }
        else if (seg2 === 'sentences') {
          const sentenceItems = await loadData('kana-sentences.json');
          await startKanaSentences(container, deck, sentenceItems);
        }
        else window.navigate(`/${deck}`);
```

- [ ] **Commit:**

```bash
git add js/app.js
git commit -m "feat: añadir ruta /hiragana/sentences y /katakana/sentences"
```

---

## Task 5: Integrar en `js/home.js`

**Files:**
- Modify: `js/home.js`

- [ ] **Localizar el array `MODES` dentro de la función `renderKanaMenu` (línea ~296). Actualmente termina con:**

```js
    { mode: 'flash',   icon: '⚡', label: 'Flash rápido',     desc: 'Elige el romaji antes de que se acabe el tiempo' },
```

Añadir después de esa línea:

```js
    { mode: 'sentences', icon: '📝', label: 'Lectura',        desc: 'Lee oraciones y elige su significado' },
```

- [ ] **Commit:**

```bash
git add js/home.js
git commit -m "feat: añadir modo Lectura al menú de hiragana y katakana"
```

---

## Task 6: Integrar en `js/stats.js`

**Files:**
- Modify: `js/stats.js`

Necesitamos dos cambios: añadir los decks nuevos al array `DECKS` con un campo opcional `filter`, y aplicar ese filtro en el loop de carga.

- [ ] **Añadir al final del array `DECKS` (antes del `]` de cierre, después de la entrada de `adjectives`):**

```js
  { id: 'kana-sentences-hiragana', label: 'Lectura hiragana', file: 'kana-sentences.json', filter: i => i.deck === 'hiragana' },
  { id: 'kana-sentences-katakana', label: 'Lectura katakana', file: 'kana-sentences.json', filter: i => i.deck === 'katakana' },
```

- [ ] **Localizar el primer loop `Promise.all(DECKS.map...)` dentro de `renderStats` — el que llama `getDeckStats`. Actualmente es:**

```js
  await Promise.all(DECKS.map(async (block) => {
    if (!block.file) return;
    const items = await loadData(block.file);
    const stats = getDeckStats(block.id, items);
```

Reemplazar las dos primeras líneas internas por:

```js
  await Promise.all(DECKS.map(async (block) => {
    if (!block.file) return;
    const rawItems = await loadData(block.file);
    const items = block.filter ? rawItems.filter(block.filter) : rawItems;
    const stats = getDeckStats(block.id, items);
```

- [ ] **Commit:**

```bash
git add js/stats.js
git commit -m "feat: añadir decks kana-sentences a las estadísticas"
```

---

## Task 7: Generar audio MP3

**Files:**
- Read: `scripts/generate-audio.py` (no modificar)

El script genera MP3 para todas las cadenas JP nuevas del JSON. Las oraciones nivel 3 tienen `\n` que el script debe tratar como texto continuo (ya lo hace, ya que el campo `jp` es una string).

- [ ] **Ejecutar el script:**

```bash
python3 scripts/generate-audio.py
```

Salida esperada: varias líneas `Descargando audio para ...` seguidas de `Manifest actualizado`. Si alguna descarga falla (error de red o rate-limit), re-ejecutar; el script es idempotente.

- [ ] **Commit si hay ficheros nuevos en `audio/`:**

```bash
git add audio/
git commit -m "data: audio MP3 para kana-sentences"
```

---

## Task 8: Push final

- [ ] **Verificar que todo está commiteado:**

```bash
git status
```

Salida esperada: `nothing to commit, working tree clean`

- [ ] **Push a GitHub Pages:**

```bash
git push
```

- [ ] **Abrir `https://reiixan.github.io/japones-n5/#/hiragana/sentences` en el navegador y verificar:**
  - La pantalla de configuración muestra "Lectura de oraciones" con el indicador de nivel.
  - El ejercicio muestra una oración en kana grande + botón TTS.
  - Para ítems de nivel 1: aparece el campo de texto romaji; al enviar se muestra feedback verde/rojo + opciones MC.
  - Al elegir opción MC correcta (con romaji correcto previo): el motor muestra ✓ y avanza.
  - Al elegir opción MC incorrecta o con romaji incorrecto: el motor muestra ✗ con la respuesta correcta.
  - La pantalla de resumen funciona con botones Inicio / Cambiar modo / Otra ronda.
  - El modo aparece en el menú de `/katakana` también.
  - Las estadísticas en `/stats` muestran "Lectura hiragana" y "Lectura katakana".
