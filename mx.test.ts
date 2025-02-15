import mx from './mx'
import {assert, test} from 'vitest'

let eq = assert.equal

test('mx', {}, () => {
  eq('<b>bold</b>', mx('[b:bold]'))
  eq('&lt;b&gt;bold&lt;/b&gt;', mx('<b>bold</b>'))
  eq('<b class="tx-red">bold</b>', mx('[b.tx-red:bold]'))
  eq('<i>italic</i>', mx('[i:italic]'))
  eq('<u>underline</u>', mx('[u:underline]'))
  eq('<h1>heading</h1>', mx('[h1:heading]'))
  eq('<a href="https://afaik.it/">https://afaik.it/</a>', mx(' [a](https://afaik.it/)'))
  eq('<a href="https://afaik.it/">Odkaz</a>', mx('[a:Odkaz](https://afaik.it/)'))
  eq('<a href="https://afaik.it/">https://afaik.it/</a>', mx('[a:https://afaik.it/]'))
  eq(
    '<a href="mailto:office@afaik.it/">office@afaik.it/</a>',
    mx('[mailto](office@afaik.it/)'),
  )
  eq('<a href="mailto:office@afaik.it/">Ofyce</a>', mx('[mailto:Ofyce](office@afaik.it/)'))
  eq(
    '<a href="mailto:office@afaik.it/">office@afaik.it/</a>',
    mx('[mailto:office@afaik.it/]'),
  )
  eq('<img src="/sl/assets/logo.svg" alt="">', mx('[img](/sl/assets/logo.svg)'))
  eq('<ul><li>item</li><li>item</li></ul>', mx('[ul:[li:item][li:item]]'))
  eq('<ol><li>item</li><li>item</li></ol>', mx('[ol:[li:item][li:item]]'))
  eq('a<br>b', mx('a[br]b'))
  eq('a<hr class="h hh">b', mx('a[hr.h hh]b'))
  eq('', mx('[-: comment [b:b]aa]'))
  eq('blah <b>b</b>aa', mx('[unknown: blah [b:b]aa]'))
  eq(
    'quotes: „double“ ‚single‘, escaped: "\'',
    mx('quotes: "double" \'single\', escaped: \\"\\\''),
  )

  eq('http://afaik.it/', mx('http://afaik.it/'))
  eq('<s-ico menu></s-ico>', mx('[ico:menu]'))
  eq('<s-btn>push me</s-btn>', mx('[btn:push me]'))
})
