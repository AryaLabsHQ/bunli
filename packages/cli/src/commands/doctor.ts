import { defineGroup } from '@bunli/core'
import completionsDoctorCommand from './doctor/completions.js'

export default defineGroup({
  name: 'doctor',
  description: 'Run diagnostics for Bunli projects',
  commands: [completionsDoctorCommand]
})
