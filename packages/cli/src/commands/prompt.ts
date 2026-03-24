import { defineGroup } from '@bunli/core'
import confirmCommand from './prompt/confirm.js'
import chooseCommand from './prompt/choose.js'
import filterCommand from './prompt/filter.js'
import spinCommand from './prompt/spin.js'
import pagerCommand from './prompt/pager.js'
import fileCommand from './prompt/file.js'
import styleCommand from './prompt/style.js'
import joinCommand from './prompt/join.js'
import inputCommand from './prompt/input.js'
import writeCommand from './prompt/write.js'
import formatCommand from './prompt/format.js'
import logCommand from './prompt/log.js'

export default defineGroup({
  name: 'prompt',
  description: 'Interactive prompts for shell scripts (gum-compatible)',
  commands: [
    confirmCommand,
    chooseCommand,
    filterCommand,
    spinCommand,
    pagerCommand,
    fileCommand,
    styleCommand,
    joinCommand,
    inputCommand,
    writeCommand,
    formatCommand,
    logCommand,
  ]
})
