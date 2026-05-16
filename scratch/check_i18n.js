import en from './src/locales/en.ts';
import ja from './src/locales/ja.ts';
import ko from './src/locales/ko.ts';
import zhCN from './src/locales/zh-CN.ts';

function getKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys = keys.concat(getKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

const enKeys = getKeys(en);
const jaKeys = getKeys(ja);
const koKeys = getKeys(ko);
const zhCNKeys = getKeys(zhCN);

console.log('Missing in JA:');
enKeys.forEach(k => {
    if (!jaKeys.includes(k)) console.log(k);
});

console.log('\nMissing in KO:');
enKeys.forEach(k => {
    if (!koKeys.includes(k)) console.log(k);
});
