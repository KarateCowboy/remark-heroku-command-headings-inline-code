// const exampleRule = require('../index')
// const Remark = require('remark')

// describe('command heading followed by another command heading', () => {
//   let markdown = null
//   beforeEach(() => {
//     markdown = fs.readFileSync('./test/generated_docs.md', 'utf8')
//   })
//   it('adds a warning message when no code example is found', () => {
//     return Remark.use(exampleRule).process(markdown)
//
//   })
//   it('does not add a warning when no code example is found')
// })

const remark = require('remark')
const fs = require('fs')
const plugin = require('../index')


const processMarkdown = async (md) => {
  return remark().use(plugin).process(md)
}

let markdown = null
beforeAll(() => {
  markdown = fs.readFileSync('./test/generated_docs.md', 'utf8')
})

describe('heroku stuff', async () => {
  test('it adds an error when there are no examples', async () => {
    markdown = fs.readFileSync('./test/two_commands_no_examples.md', 'utf8')

    const lint = await processMarkdown(markdown)
    expect(lint.messages.length).toBe(2)
    expect(lint.messages[0].message).toBe('Command has no usage example')
  })
  test('it does not add error messages when one is present', async () => {
    markdown = fs.readFileSync('./test/command_with_example.md', 'utf8')

    const lint = await processMarkdown(markdown)
    expect(lint.messages.length).toBe(0)
  })
})

describe.skip('remark-lint-no-dead-urls', () => {
  test('works with no URLs', () => {
    const lint = processMarkdown(dedent`
      # Title

      No URLs in here.
    `)

    expect(linkCheck).toHaveBeenCalledTimes(0)
    return lint.then(vFile => {
      expect(vFile.messages.length).toBe(0)
    })
  })

  test('works', () => {
    const lint = processMarkdown(dedent`
      # Title

      Here is a [good link](https://www.github.com).

      Here is a [bad link](https://github.com/unified/oops).
    `)

    expect(linkCheck).toHaveBeenCalledTimes(2)
    expect(linkCheck.mock.calls[0][0]).toBe('https://www.github.com')
    expect(linkCheck.mock.calls[0][1]).toEqual({baseUrl: undefined})
    expect(linkCheck.mock.calls[1][0]).toBe('https://github.com/unified/oops')
    expect(linkCheck.mock.calls[1][1]).toEqual({baseUrl: undefined})

    // Invoke the callbacks
    linkCheck.mock.calls[0][2](null, {status: 'alive'})
    linkCheck.mock.calls[1][2](null, {status: 'dead'})

    return lint.then(vFile => {
      expect(vFile.messages.length).toBe(1)
      expect(vFile.messages[0].reason).toBe(
        'Link to https://github.com/unified/oops is dead'
      )
    })
  })

  test('caches internally', () => {
    const lint = processMarkdown(dedent`
      # Title

      Here is a [good link](https://github.com/davidtheclark).
      And here it is [again](https://github.com/davidtheclark).

      Here is a [bad link](https://github.com/davidtheclark/oops).
      And here it is [again](https://github.com/davidtheclark/oops).
    `)

    const lintAgain = processMarkdown(dedent`
      # Title

      Here is a [good link](https://github.com/davidtheclark).
      And here it is [again](https://github.com/davidtheclark).

      Here is a [bad link](https://github.com/davidtheclark/oops).
      And here it is [again](https://github.com/davidtheclark/oops).
    `)

    expect(linkCheck).toHaveBeenCalledTimes(2)
    expect(linkCheck.mock.calls[0][0]).toBe('https://github.com/davidtheclark')
    expect(linkCheck.mock.calls[1][0]).toBe(
      'https://github.com/davidtheclark/oops'
    )

    // Invoke the callbacks
    linkCheck.mock.calls[0][2](null, {status: 'alive'})
    linkCheck.mock.calls[1][2](null, {status: 'dead'})

    return lint.then(lintAgain).then(vFile => {
      expect(vFile.messages.length).toBe(2)
      expect(vFile.messages[0].reason).toBe(
        'Link to https://github.com/davidtheclark/oops is dead'
      )
      expect(vFile.messages[1].reason).toBe(
        'Link to https://github.com/davidtheclark/oops is dead'
      )
    })
  })

  test('caches externally', () => {
    const externalCache = {}

    const lint = processMarkdown(
      dedent`
      # Title

      Here is a [good link](https://github.com/davidtheclark).
      And here it is [again](https://github.com/davidtheclark).

      Here is a [bad link](https://github.com/davidtheclark/oops).
      And here it is [again](https://github.com/davidtheclark/oops).
    `,
      {cache: externalCache}
    )

    const lintAgain = processMarkdown(
      dedent`
      # Title

      Here is a [good link](https://github.com/davidtheclark).
      And here it is [again](https://github.com/davidtheclark).

      Here is a [bad link](https://github.com/davidtheclark/oops).
      And here it is [again](https://github.com/davidtheclark/oops).
    `,
      {cache: externalCache}
    )

    expect(linkCheck).toHaveBeenCalledTimes(2)
    expect(linkCheck.mock.calls[0][0]).toBe('https://github.com/davidtheclark')
    expect(linkCheck.mock.calls[1][0]).toBe(
      'https://github.com/davidtheclark/oops'
    )
    expect(externalCache['https://github.com/davidtheclark']).toBe(undefined)
    expect(externalCache['https://github.com/davidtheclark/oops']).toBe(
      undefined
    )

    // Invoke the callbacks
    linkCheck.mock.calls[0][2](null, {status: 'alive'})
    linkCheck.mock.calls[1][2](null, {status: 'dead'})

    return lint.then(lintAgain).then(vFile => {
      expect(externalCache['https://github.com/davidtheclark']).toBe('alive')
      expect(externalCache['https://github.com/davidtheclark/oops']).toBe(
        'dead'
      )

      expect(vFile.messages.length).toBe(2)
      expect(vFile.messages[0].reason).toBe(
        'Link to https://github.com/davidtheclark/oops is dead'
      )
      expect(vFile.messages[1].reason).toBe(
        'Link to https://github.com/davidtheclark/oops is dead'
      )
    })
  })

  test('skips relative URL without baseUrl', () => {
    const lint = processMarkdown(dedent`
      Here is a [good relative link](/wooorm/remark).

      Here is a [bad relative link](/wooorm/reeeemark).
    `)

    expect(linkCheck).toHaveBeenCalledTimes(0)

    return lint.then(vFile => {
      expect(vFile.messages.length).toBe(0)
    })
  })

  test('checks relative URL with baseUrl (string option)', () => {
    const lint = processMarkdown(
      dedent`
      Here is a [good relative link](/wooorm/rehype).

      Here is a [bad relative link](/wooorm/reeeehype).
    `,
      'https://www.github.com'
    )

    expect(linkCheck).toHaveBeenCalledTimes(2)
    expect(linkCheck.mock.calls[0][0]).toBe('/wooorm/rehype')
    expect(linkCheck.mock.calls[0][1]).toEqual({
      baseUrl: 'https://www.github.com'
    })
    expect(linkCheck.mock.calls[1][0]).toBe('/wooorm/reeeehype')
    expect(linkCheck.mock.calls[1][1]).toEqual({
      baseUrl: 'https://www.github.com'
    })

    // Invoke the callbacks
    linkCheck.mock.calls[0][2](null, {status: 'alive'})
    linkCheck.mock.calls[1][2](null, {status: 'dead'})

    return lint.then(vFile => {
      expect(vFile.messages.length).toBe(1)
      expect(vFile.messages[0].reason).toBe(
        'Link to /wooorm/reeeehype is dead'
      )
    })
  })

  test('works with definitions and images', () => {
    const lint = processMarkdown(
      dedent`
      # Title

      Here is a good pig: ![picture of pig](/pig-photos/384).

      Download the pig picture [here](/pig-photos/384).

      Here is a [bad link]. Here is that [bad link] again.

      [bad link]: /oops/broken
    `,
      {baseUrl: 'http://my.domain.com'}
    )

    expect(linkCheck).toHaveBeenCalledTimes(2)
    expect(linkCheck.mock.calls[0][0]).toBe('/pig-photos/384')
    expect(linkCheck.mock.calls[0][1]).toEqual({
      baseUrl: 'http://my.domain.com'
    })
    expect(linkCheck.mock.calls[1][0]).toBe('/oops/broken')
    expect(linkCheck.mock.calls[1][1]).toEqual({
      baseUrl: 'http://my.domain.com'
    })

    // Invoke the callbacks
    linkCheck.mock.calls[0][2](null, {status: 'alive'})
    linkCheck.mock.calls[1][2](null, {status: 'dead'})

    return lint.then(vFile => {
      expect(vFile.messages.length).toBe(1)
      expect(vFile.messages[0].reason).toBe('Link to /oops/broken is dead')
    })
  })
})

