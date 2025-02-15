// Minimal eXtensible markup
class MxParser {
  tx: str

  constructor(tx: str) {
    // sanitize line ends + trim
    tx = tx
      .split(/\r?\n/)
      .map((ln) => ln.trim())
      .join('\n')

    // empty lines = line breaks
    tx = tx.replace(/\n{2,}/g, '[br]')
    // make one line
    this.tx = tx.replace(/\n/g, ' ').trim()
  }

  private _entities(): void {
    // convert to entities
    // TODO array
    let entMap: {[key: str]: RegExp} = {
      // html specials
      amp: /&/g,
      lt: /</g,
      gt: />/g,
      // escaped quotes
      '#34': /\\"/g,
      '#39': /\\'/g,
      // escaped [:]()_~ chars, used in MX tags
      '#91': /\\\[/g,
      '#58': /\\\:/g,
      '#93': /\\\]/g,
      '#40': /\\\(/g,
      '#41': /\\\)/g,
      '#95': /\\\_/g,
      '#126': /\\\~/g,
    }

    let tx = this.tx
    for (let e in entMap) tx = tx.replace(entMap[e], `&${e};`)

    // escape : in url protocol, e.g. https://
    this.tx = tx.replace(/(?<=(?:[a-zA-Z0-9])):\/\//g, '&#58;//')
  }

  private _readTo(...chars: str[]): str {
    let tx = this.tx

    // the first of chars
    let pos = -1
    for (let c of chars) {
      let p = tx.indexOf(c)
      if (-1 < p && (pos < 0 || p < pos)) pos = p
    }

    let head = ''
    if (pos < 0) {
      head = tx
      this.tx = ''
    } else {
      head = tx.substring(0, pos)
      this.tx = tx.substring(pos)
    }

    return head
  }

  private _readTag(): [str, str, str] {
    let tag = ''
    let par = '' // parameter
    let head = this._readTo('[', ']')

    let skip = () => (this.tx = this.tx.substring(1))
    let is = (c: str) => c == this.tx[0]

    // TODO if (tx)
    switch (this.tx[0]) {
      // MX tag starts
      case '[':
        skip()
        tag = this._readTo(':', ']').trim()
        if (is(':')) {
          skip()
          // skip the first space after :
          if (is(' ')) skip()
        }
        break
      // MX tag ends
      case ']':
        skip()
        tag = ']'
        // optional parameter (...)
        if (is('(')) {
          skip()
          par = this._readTo(')')
          skip()
        }
        break
    }

    return [head, tag, par]
  }

  private _splitTag(tagClsPar: str): [str, str, str] {
    // param
    let [tagCls = '', par = ''] = tagClsPar.split('/')
    // class
    let [tag = '', cls = ''] = tagCls.split('.')

    return [tag, cls, par]
  }

  private _parseTag(inTag: str, tx: str, arg: str): str {
    if (!inTag) return tx
    let [tag, cls, par] = this._splitTag(inTag)

    // empty tag is <span>
    tag ||= 'span'

    cls = cls ? ` class="${cls}"` : ''

    // pars: Array, par: str
    let unquote = (tx: str) => tx.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    let pars = unquote(par)
      .split(' ')
      .filter((par) => par)

    // par: passed on literally
    par = pars.join(' ')
    par = par ? ' ' + par : ''

    arg ||= ''

    // comment
    if ('-' == tag[0]) return ''

    // special tags
    switch (tag) {
      case 'star':
        return '<sup>*</sup>'
      case 'br':
        return '<br>'
      case 'hr':
        return `<hr${cls}>`
      case 'a':
        tx ||= arg
        arg ||= tx
        let ps = pars.includes('blank') ? ' target="_blank"' : ''
        return `<a${cls} href="${arg}"${ps}>${tx}</a>`
      case 'mailto':
        tx ||= arg
        arg ||= tx
        return `<a${cls} href="mailto:${arg}">${tx}</a>`
      case 'tel':
        tx ||= arg
        arg ||= tx
        arg = arg.replace(/\s+/g, '')
        return `<a${cls} href="tel:${arg}">${tx}</a>`
      case 'img':
        return `<img${cls}${par} src="${arg}" alt="">`
      case 'th2':
        return `<th colspan="2"${cls}>${tx}</th>`
      case 'td2':
        return `<td colspan="2"${cls}>${tx}</td>`
      // custom element tags
      case 'ico':
        return `<s-ico ${tx}${cls}></s-ico>`
    }

    // allowed tags
    let allowedTags: {[key: str]: str} = {
      div: 'div',
      span: 'span',
      b: 'b',
      i: 'i',
      u: 'u',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      ul: 'ul',
      ol: 'ol',
      li: 'li',
      row: 'f-row',
      table: 'table',
      tr: 'tr',
      th: 'th',
      td: 'td',
      // custom element tags
      btn: 's-btn',
    }

    // allowed tags
    let t = allowedTags[tag]
    if (!t) {
      // ignore the tag and use the content as is
      return tx
    }
    // TODO let t
    // if (!(t = ordTags[tag]))
    //   if ((t = elTags[tag])) fetchOne(t) // fetch the custom element
    //   // else ignore the tag and use the content as is
    //   else return tx

    // formatted tag
    arg = arg ? ' ' + arg : ''
    return `<${t}${cls}${par}${arg}>${tx}</${t}>`
  }

  private _parse(inTag: str): str {
    let typo: {[key: str]: RegExp} = {
      // @ is a special mark for typography
      // typographical quotes
      '@34': /"/g,
      '@39': /'/g,
      // _ -> nbsp
      nbsp: /_/g,
      // ~ -> non-breakable hyphen
      '‑': /~/g,
    }

    let out = ''
    for (;;) {
      let [head, tag, par] = this._readTag()
      for (let e in typo) head = head.replace(typo[e], `&${e};`)
      out += head
      if (!tag) return out
      if (']' === tag) return this._parseTag(inTag, out, par)
      out += this._parse(tag)
    }
  }

  mx(): str {
    this._entities()

    let quotes: {[key: str]: [str, str]} = {
      '&@34;': ['„', '“'],
      '&@39;': ['‚', '‘'],
    }

    let typography = (tx: str): str => {
      for (let e in quotes) {
        let i = 0
        for (;;) {
          // replace only one occurrence
          let pos = tx.indexOf(e)
          if (-1 == pos) break
          tx = tx.substring(0, pos) + quotes[e][i] + tx.substring(pos + e.length)
          i = i ? 0 : 1
        }
      }
      return tx
    }

    let unent = (tx: str): str => {
      let map: [RegExp, str][] = [
        [/&#34;/g, '"'],
        [/&#39;/g, "'"],
        [/&#91;/g, '['],
        [/&#58;/g, ':'],
        [/&#93;/g, ']'],
        [/&#40;/g, '('],
        [/&#41;/g, ')'],
        [/&#95;/g, '_'],
        [/&#126;/g, '~'],
      ]
      for (let [e, c] of map) tx = tx.replace(e, c)
      return tx
    }

    // TODO revert entities
    return unent(typography(this._parse('')))
  }
}

function mx(tx: str): str {
  return new MxParser(tx).mx()
}

export default mx
