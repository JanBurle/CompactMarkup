// Minimal Markup

let mm: (tx: str) => str = (() => {
  // &, < html entities
  let sanitize = (tx: str): str => tx.replace(/&/g, '&amp;').replace(/</g, '&lt;')

  // \\ > break
  let br = (ln: str): str => ln.replace(/\\\\/g, '<br/>')

  // typography
  let typo = (ln: str): str =>
    ln
      // -- > n-dash
      .replace(/([^-])--([^-])/g, '$1&ndash;$2')
      // --- > m-dash
      .replace(/([^-])---([^-])/g, '$1&mdash;$2')

  // markup
  let marks = (line: str): str =>
    line
      // **...** > bold
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      // //...// > italics
      .replace(/\/\/(.*?)\/\//g, '<em>$1</em>')
      // __...__ > underline
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // ~~...~~ > code
      .replace(/~~(.*?)~~/g, '<code>$1</code>')

  // # ## ### > hX
  let header = (ln: str): str => {
    let m = ln.match(/^(#+)\s*(.*)/)
    if (m) {
      let n = (m as any)[1].length
      ln = `<h${n}>${m[2]}</h${n}>`
    }
    return ln
  }

  // ---... > <hr>
  let hr = (ln: str): str => (/^---+/u.test(ln) ? '<hr/>' : ln)

  /* TODO: blocks, lines, empty, ol, ul, p, hr */

  let mm = (tx: str): str => {
    // break into r-trimmed lines
    let lines = sanitize(tx)
      .split('\n')
      .map((ln) => ln.trimEnd())
    // each line
    lines = lines.map((ln) => {
      ;[br, typo, marks, header, hr].forEach((fn) => {
        ln = fn(ln)
      })
      return ln
    })
    // join lines
    return lines.join('\n')
  }

  return mm
})()

export default mm
