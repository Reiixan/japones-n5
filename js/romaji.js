// Kana → Romaji (Hepburn). Soporta hiragana, katakana, dakuten, handakuten,
// yōon (palatalizados), sokuon (っ duplicación) y chōonpu (ー alargamiento).
// Caracteres no kana (kanji, signos) se pasan tal cual.

const TABLE_2 = {
  // Hiragana yōon
  'きゃ':'kya','きゅ':'kyu','きょ':'kyo',
  'しゃ':'sha','しゅ':'shu','しょ':'sho',
  'ちゃ':'cha','ちゅ':'chu','ちょ':'cho',
  'にゃ':'nya','にゅ':'nyu','にょ':'nyo',
  'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo',
  'みゃ':'mya','みゅ':'myu','みょ':'myo',
  'りゃ':'rya','りゅ':'ryu','りょ':'ryo',
  'ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
  'じゃ':'ja','じゅ':'ju','じょ':'jo',
  'びゃ':'bya','びゅ':'byu','びょ':'byo',
  'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo',
  // Katakana yōon
  'キャ':'kya','キュ':'kyu','キョ':'kyo',
  'シャ':'sha','シュ':'shu','ショ':'sho',
  'チャ':'cha','チュ':'chu','チョ':'cho',
  'ニャ':'nya','ニュ':'nyu','ニョ':'nyo',
  'ヒャ':'hya','ヒュ':'hyu','ヒョ':'hyo',
  'ミャ':'mya','ミュ':'myu','ミョ':'myo',
  'リャ':'rya','リュ':'ryu','リョ':'ryo',
  'ギャ':'gya','ギュ':'gyu','ギョ':'gyo',
  'ジャ':'ja','ジュ':'ju','ジョ':'jo',
  'ビャ':'bya','ビュ':'byu','ビョ':'byo',
  'ピャ':'pya','ピュ':'pyu','ピョ':'pyo',
  // Katakana adicionales para préstamos (no en N5 estricto pero por completitud)
  'ファ':'fa','フィ':'fi','フェ':'fe','フォ':'fo',
  'ティ':'ti','ディ':'di','ウィ':'wi','ウェ':'we','ウォ':'wo',
  'チェ':'che','シェ':'she','ジェ':'je',
};

const TABLE_1 = {
  // Hiragana base
  'あ':'a','い':'i','う':'u','え':'e','お':'o',
  'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
  'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
  'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
  'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  'や':'ya','ゆ':'yu','よ':'yo',
  'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
  'わ':'wa','を':'wo','ん':'n',
  // Hiragana dakuten
  'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
  'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
  'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
  'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
  // Hiragana handakuten
  'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
  // Katakana base
  'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
  'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
  'サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
  'タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
  'ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no',
  'ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
  'マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo',
  'ヤ':'ya','ユ':'yu','ヨ':'yo',
  'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro',
  'ワ':'wa','ヲ':'wo','ン':'n',
  // Katakana dakuten
  'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go',
  'ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo',
  'ダ':'da','ヂ':'ji','ヅ':'zu','デ':'de','ド':'do',
  'バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo',
  // Katakana handakuten
  'パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po',
  // Puntuación común
  '。':'.', '、':',', '！':'!', '？':'?', '・':' ',
  '「':'"', '」':'"', '『':'"', '』':'"',
};

const SOKUON = new Set(['っ', 'ッ']);
const CHOONPU = 'ー';

export function kanaToRomaji(text) {
  if (!text) return '';
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // Sokuon: duplica la consonante de la siguiente sílaba.
    if (SOKUON.has(ch)) {
      const two = text[i + 1] + (text[i + 2] || '');
      const next = TABLE_2[two] || TABLE_1[text[i + 1]] || '';
      if (next && /^[a-z]/.test(next)) {
        out += next[0] === 'c' && next[1] === 'h' ? 't' : next[0];  // っち → tchi
      }
      i++;
      continue;
    }

    // Chōonpu: alarga la vocal anterior (katakana).
    if (ch === CHOONPU) {
      const last = out[out.length - 1];
      if (last && 'aiueo'.includes(last)) out += last;
      i++;
      continue;
    }

    // Yōon (2 caracteres).
    const two = ch + (text[i + 1] || '');
    if (TABLE_2[two]) {
      out += TABLE_2[two];
      i += 2;
      continue;
    }

    // 1 carácter.
    if (TABLE_1[ch]) {
      // Caso especial: ん seguido de vocal o y → apóstrofo (ej. しんいち → shin'ichi)
      if (TABLE_1[ch] === 'n') {
        const nextCh = text[i + 1];
        const nextRomaji = TABLE_1[nextCh] || (TABLE_2[nextCh + (text[i + 2] || '')] || '');
        if (nextRomaji && /^[aiueoy]/.test(nextRomaji)) {
          out += "n'";
          i++;
          continue;
        }
      }
      out += TABLE_1[ch];
      i++;
      continue;
    }

    // Carácter no kana (kanji, etc.): pasar tal cual.
    out += ch;
    i++;
  }
  return out;
}

const ROMAJI_KEY = 'jp_n5_romaji_on';

export function isRomajiOn() {
  return localStorage.getItem(ROMAJI_KEY) === '1';
}

export function setRomajiOn(on) {
  if (on) localStorage.setItem(ROMAJI_KEY, '1');
  else localStorage.removeItem(ROMAJI_KEY);
}
