<?
class mxParser
{
  private $tx;
  function __construct($tx)
  {
    // sanitize line ends + trim
    $tx = preg_split('/$\R?^/m', $tx);
    $tx = array_map('trim', $tx);
    $tx = implode("\n", $tx);

    // empty lines = line breaks
    $tx = preg_replace('/\n{2,}/m', '[br]', $tx);
    // make one line
    $this->tx = trim(str_replace("\n", ' ', $tx));
  }

  function forJS()
  {
    // escape for JS, further processing in JS
    return addslashes($this->tx);
  }

  function _entities()
  {
    // convert to entities
    $entMap = [
      // html specials
      'amp' => '&',
      'lt'  => '<',
      'gt'  => '>',
      // escaped quotes
      '#34' => '\\"',
      '#39' => "\\'",
      // escaped [:]()_~ chars, used in MX tags
      '#91' => '\\[',
      '#58' => '\\:',
      '#93' => '\\]',
      '#40' => '\\(',
      '#41' => '\\)',
      '#95' => '\\_',
      '#126' => '\\~'
    ];

    $tx = $this->tx;
    foreach ($entMap as $entity => $s)
      $tx = str_replace($s, "&{$entity};", $tx);

    // escape : in url protocol, e.g. https://
    $this->tx = preg_replace('/(?<=(?:[a-zA-Z0-9])):\/\//', '&#58;//', $tx);
  }

  function _readTo(...$chars)
  {
    $tx = $this->tx;

    // the first of $chars
    $pos = -1;
    foreach ($chars as $c) {
      $p = strpos($tx, $c);
      if ($p !== false && ($pos < 0 || $p < $pos))
        $pos = $p;
    }

    $head = '';
    if ($pos < 0) {
      $head = $tx;
      $this->tx = '';
    } else {
      $head = substr($tx, 0, $pos);
      $this->tx = substr($tx, $pos);
    }

    return $head;
  }

  function _readTag()
  {
    $skip = function () {
      $this->tx = substr($this->tx, 1);
    };

    $is = fn($c) => $this->tx && $c == $this->tx[0];

    $tag = '';
    $par = ''; // parameter
    $head = $this->_readTo('[', ']');

    if ($this->tx) switch ($this->tx[0]) {
        // MX tag starts
      case '[':
        $skip();
        $tag = trim($this->_readTo(':', ']'));
        if ($is(':')) {
          $skip();
          // skip the first space after :
          if ($is(' ')) $skip();
        }
        break;
        // MX tag ends
      case ']':
        $skip();
        $tag = ']';
        // optional parameter (...)
        if ($is('(')) {
          $skip();
          $par = trim($this->_readTo(')'));
          $skip();
        }
        break;
    }

    return [$head, $tag, $par];
  }

  function _splitTag($tagClsPar)
  {
    // param
    $parts = explode('/', $tagClsPar);
    $tagCls = $parts[0] ?? '';
    $par = $parts[1] ?? '';

    // class
    $tagParts = explode('.', $tagCls);
    $tag = $tagParts[0] ?? '';
    $cls = $tagParts[1] ?? '';

    return [$tag, $cls, $par];
  }

  function _parseTag($inTag, $tx, $arg)
  {
    if (!$inTag) return $tx;
    list($tag, $cls, $par) = $this->_splitTag($inTag);

    // empty tag is <span>
    $tag = $tag ?: 'span';

    $cls = $cls ? ' class="' . $cls . '"' : '';

    // pars: Array, par: string
    $unquote = fn($tx) => str_replace(['&quot;', '&#39;'], ['"', "'"], $tx);
    $pars = array_filter(explode(' ', $unquote($par)));

    // par: passed on literally
    $par = implode(' ', $pars);
    $par = $par ? ' ' . $par : '';

    $arg = $arg ?: '';

    // comment
    if ($tag[0] == '-') return '';

    // special tags
    switch ($tag) {
      case 'star':
        return '<sup>*</sup>';
      case 'br':
        return '<br>';
      case 'br2':
        return '<br><br>';
      case 'hr':
        return "<hr$cls>";
      case 'a':
        $tx = $tx ?: $arg;
        $arg = $arg ?: $tx;
        $ps = in_array('blank', $pars) ? ' target="_blank"' : '';
        return "<a$cls href=\"$arg\"$ps>$tx</a>";
      case 'mailto':
        $tx = $tx ?: $arg;
        $arg = $arg ?: $tx;
        return "<a$cls href=\"mailto:$arg\">$tx</a>";
      case 'tel':
        $tx = $tx ?: $arg;
        $arg = $arg ?: $tx;
        $arg = str_replace(' ', '', $arg);
        return "<a$cls href=\"tel:$arg\">$tx</a>";
      case 'img':
        return "<img$cls$par src=\"$arg\" alt=\"\">";
      case 'th2':
        return "<th colspan=\"2\"$cls>$tx</th>";
      case 'td2':
        return "<td colspan=\"2\"$cls>$tx</td>";
    }

    // allowed tags
    $allowedTags = [
      'div' => 'div',
      'span' => 'span',
      'b' => 'b',
      'i' => 'i',
      'u' => 'u',
      'h1' => 'h1',
      'h2' => 'h2',
      'h3' => 'h3',
      'ul' => 'ul',
      'ol' => 'ol',
      'li' => 'li',
      'row' => 'flex-row',
      'table' => 'table',
      'tr' => 'tr',
      'th' => 'th',
      'td' => 'td',
      // custom element tags
      'btn' => 'x-btn',
      'icon' => 'x-icon',
    ];

    // allowed tags
    if (!($t = $allowedTags[$tag] ?? null))
      // ignore the tag and use the content as is
      return $tx;

    // formatted tag
    $arg = $arg ? ' ' . $arg : '';
    return "<$t$cls$par$arg>$tx</$t>";
  }

  function _parse($inTag)
  {
    $typo = [
      // @ is a special mark for typography
      // typographical quotes
      '@34' => '"',
      '@39' => "'",
      // _ -> nbsp
      'nbsp' => '_',
      // ~ -> non-breaking hyphen
      '#8209' => '~'
    ];

    $out = '';
    while (true) {
      list($head, $tag, $par) = $this->_readTag();
      foreach ($typo as $entity => $rx)
        $head = str_replace($rx, "&{$entity};", $head);
      $out .= $head;
      if (!$tag) return $out;
      if (']' == $tag) return $this->_parseTag($inTag, $out, $par);
      $out .= $this->_parse($tag);
    }
  }

  function mx()
  {
    $this->_entities();

    $quotes = [
      '&@34;' => ['„', '“'],
      '&@39;' => ['‚', '‘'],
    ];

    $typography = function ($tx) use ($quotes) {
      foreach ($quotes as $e => $q) {
        $i = 0;
        do {
          $tx0 = $tx;
          // replace only one occurence
          $pos = strpos($tx, $e);
          if ($pos !== false)
            $tx = substr_replace($tx, $q[$i], $pos, strlen($e));
          $i = $i ? 0 : 1;
        } while ($tx0 != $tx);
      }
      return $tx;
    };

    // TODO revert entities
    return $typography($this->_parse('', $this->tx));
  }
}

function mxForJs($tx)
{
  return (new mxParser($tx))->forJS();
}

function mx($tx)
{
  return (new mxParser($tx))->mx();
}
