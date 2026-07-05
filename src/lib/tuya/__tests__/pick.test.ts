import { describe, it, expect } from 'vitest'
import { pick } from '../api.functions'

describe('tuya pick matching', () => {
  it('battery_voltage does NOT match battery_voltage_class', () => {
    const codes = [{ code: 'battery_voltage_class', value: 24 }]
    const res = pick(codes as any, ['battery_voltage'])
    expect(res).toBeUndefined()
  })

  it('pv_voltage matches PV_Voltage (case/order insensitive)', () => {
    const codes = [{ code: 'PV_Voltage', value: 123 }]
    const res = pick(codes as any, ['pv_voltage'])
    expect(res).toBeDefined()
    expect(res?.code).toBe('PV_Voltage')
  })
})
