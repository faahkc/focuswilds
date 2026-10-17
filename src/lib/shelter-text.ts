import type { Language } from './shelter.ts'

const en = {
  shelter: 'The last hearth', safe: 'The fort is safe while you are away.', loading: 'Opening the shelter…',
  loadError: 'Could not load the shelter. Your saved progress has not been changed.', retry: 'Retry',
  startNew: 'Light the hearth', newGame: 'Five survivors have reached the abandoned fort. Begin a new shelter; your previous journey stays separate.',
  legacy: 'Open previous journey', crew: 'Survivors', stores: 'Storage', explore: 'Explore', journal: 'Journal', history: 'History', settings: 'Settings', close: 'Close',
  focus: 'Focus', minutes: 'Minutes', title: 'Focus title', start: 'Start', pause: 'Pause', resume: 'Resume', finish: 'Stop and keep progress',
  partial: 'Partial focus advances jobs. Only a finished timer counts as a completed session.', saving: 'Saving…', saved: 'Saved',
  saveError: 'Could not confirm the save. Keep this page open and retry the same action.', stale: 'Another tab changed the shelter. Refresh saved progress before continuing.',
  refresh: 'Refresh saved progress', pending: 'One action is waiting to save.', timerStorage: 'This browser cannot preserve the timer. Keep this page open until it is saved.',
  reviewFocus: 'Keep unsaved focus', reviewConfirm: 'Apply this unsaved focus to the current shelter jobs? Another tab changed the shelter. Review its jobs first.',
  corruptTimer: 'The stored timer could not be read. It has been kept unchanged.', resetTimer: 'Discard unreadable timer', resetConfirm: 'Discard this unreadable local timer? Saved account progress will stay.',
  activeJobs: 'Finish or stop the timer before changing jobs or exploring.', language: 'Language', languageHint: 'Language follows this account on your next sign-in or explicit refresh.',
  total: 'Total focus', sessions: 'Completed sessions', beds: 'Housing', slots: 'Slots', hp: 'HP', idle: 'Resting',
  job: 'Assign work', garden: 'Garden', recover: 'Recovery', housing: 'Expand housing', storage: 'Expand storage', medicine: 'Medicine', prepareMedicine: 'Prepare medicine', sword: 'Sword', coat: 'Armor', repair: 'Repair', train: 'Retrain',
  scout: 'Scout', forager: 'Forager', gatherer: 'Gatherer', personal: 'Personal skill', general: 'General skill',
  wood: 'Wood', stone: 'Stone', provisions: 'Provisions', discard: 'Discard one', equip: 'Equip', unequip: 'Remove', weapon: 'Weapon', armor: 'Armor', usable: 'Usable item', heal: 'Use medicine', none: 'None', durability: 'Durability',
  depart: 'Depart', team: 'Choose up to three survivors', supply: 'Packed provisions', border: 'Border trail', hollow: 'Rowan hollow', barrow: 'The old barrow', locked: 'Undiscovered',
  return: 'Return safely', returnHint: 'Items that do not fit stay at the marked location. You can recover them on another expedition.',
  event: 'Event', actor: 'Acting survivor', quiet: 'Quiet approach', force: 'Force a path', observe: 'Observe first', noisy: 'Noisy', unknown: 'Unknown',
  damage: 'Possible damage', death: 'Possible permanent death', loot: 'Possible loot (75% chance)', confirm: 'Confirm action',
  areaDone: 'This trail is complete. Return to the fort.', rescue: 'Escort to the fort', waiting: 'An injured traveler is waiting here. Their skills suggest knowledge of old paths.',
  helper: 'Supporting survivor', escortHint: 'Each injured traveler reduces their helper’s carrying capacity by 2 slots and reserves one bed.',
  collect: 'Recover marked items', leave: 'Choose what to carry', keep: 'Keep', packHint: 'Choose carried quantities before confirming. Everything left stays marked at this location.',
  location: 'Marked locations', knowledge: 'Confirmed observations', empty: 'Nothing here yet.', more: 'Load more',
  survivor: 'Survivor', traveler: 'Traveler', arrival: 'New arrival', working: 'Working', outside: 'On expedition',
  error: 'This action is unavailable. Check materials, space, helpers and supplies.',
  jobCost: 'Materials and focused minutes', resetRisk: 'Death is permanent. The fort and knowledge remain.',
}
const th: typeof en = {
  shelter: 'กองไฟสุดท้าย', safe: 'ป้อมปลอดภัยระหว่างที่คุณไม่อยู่', loading: 'กำลังเปิดที่พักพิง…',
  loadError: 'โหลดที่พักพิงไม่ได้ ข้อมูลที่บันทึกไว้ยังไม่เปลี่ยนแปลง', retry: 'ลองอีกครั้ง',
  startNew: 'จุดไฟในป้อม', newGame: 'ผู้รอดชีวิตห้าคนมาถึงป้อมร้าง เริ่มที่พักพิงใหม่ โดยเก็บการเดินทางเดิมแยกไว้',
  legacy: 'เปิดการเดินทางเดิม', crew: 'ผู้รอดชีวิต', stores: 'คลัง', explore: 'สำรวจ', journal: 'สมุดบันทึก', history: 'ประวัติ', settings: 'ตั้งค่า', close: 'ปิด',
  focus: 'โฟกัส', minutes: 'นาที', title: 'ชื่อช่วงโฟกัส', start: 'เริ่ม', pause: 'พัก', resume: 'ทำต่อ', finish: 'หยุดและเก็บความคืบหน้า',
  partial: 'โฟกัสไม่ครบก็สะสมงานได้ นับรอบสำเร็จเมื่อครบเวลาเท่านั้น', saving: 'กำลังบันทึก…', saved: 'บันทึกแล้ว',
  saveError: 'ยังยืนยันการบันทึกไม่ได้ โปรดเปิดหน้านี้ไว้แล้วลองบันทึกการกระทำเดิมอีกครั้ง', stale: 'อีกแท็บเปลี่ยนข้อมูลป้อมแล้ว โปรดโหลดข้อมูลที่บันทึกไว้ก่อนทำต่อ',
  refresh: 'โหลดข้อมูลที่บันทึกไว้ใหม่', pending: 'มีการกระทำรอบันทึกหนึ่งรายการ', timerStorage: 'เบราว์เซอร์เก็บตัวจับเวลาไม่ได้ โปรดเปิดหน้านี้ไว้จนบันทึกสำเร็จ',
  reviewFocus: 'เก็บเวลาโฟกัสที่ยังไม่บันทึก', reviewConfirm: 'ใช้เวลาโฟกัสที่ยังไม่บันทึกกับงานปัจจุบันในป้อมหรือไม่? อีกแท็บเปลี่ยนข้อมูลป้อมแล้ว โปรดตรวจงานก่อน',
  corruptTimer: 'อ่านตัวจับเวลาที่เก็บไว้ไม่ได้ ข้อมูลเดิมยังอยู่', resetTimer: 'ทิ้งตัวจับเวลาที่อ่านไม่ได้', resetConfirm: 'ทิ้งตัวจับเวลาท้องถิ่นที่อ่านไม่ได้นี้หรือไม่? ความคืบหน้าบัญชีที่บันทึกไว้ยังอยู่',
  activeJobs: 'จบหรือหยุดตัวจับเวลาก่อนเปลี่ยนงานหรือออกสำรวจ', language: 'ภาษา', languageHint: 'ภาษาตามบัญชีไปเมื่อเข้าระบบครั้งหน้า หรือเมื่อสั่งโหลดข้อมูลใหม่',
  total: 'โฟกัสทั้งหมด', sessions: 'รอบที่สำเร็จ', beds: 'ที่พัก', slots: 'ช่อง', hp: 'HP', idle: 'พักผ่อน',
  job: 'มอบหมายงาน', garden: 'ทำสวน', recover: 'พักฟื้น', housing: 'ขยายที่พัก', storage: 'ขยายคลัง', medicine: 'ยา', prepareMedicine: 'เตรียมยา', sword: 'ดาบ', coat: 'เกราะ', repair: 'ซ่อมแซม', train: 'ฝึกใหม่',
  scout: 'ลาดตระเวน', forager: 'หาของป่า', gatherer: 'เก็บรวบรวม', personal: 'ทักษะประจำตัว', general: 'ทักษะทั่วไป',
  wood: 'ไม้', stone: 'หิน', provisions: 'เสบียง', discard: 'ทิ้งหนึ่งชิ้น', equip: 'สวมใส่', unequip: 'ถอดออก', weapon: 'อาวุธ', armor: 'เกราะ', usable: 'ของใช้', heal: 'ใช้ยา', none: 'ไม่มี', durability: 'ความทนทาน',
  depart: 'ออกเดินทาง', team: 'เลือกผู้รอดชีวิตไม่เกินสามคน', supply: 'เสบียงติดตัว', border: 'เส้นทางชายแดน', hollow: 'หุบเขาโรแวน', barrow: 'สุสานเก่า', locked: 'ยังไม่ค้นพบ',
  return: 'กลับป้อมอย่างปลอดภัย', returnHint: 'ของที่คลังรับไม่ไหวจะอยู่ที่จุดทำเครื่องหมาย กลับมาเก็บในการสำรวจครั้งหน้าได้',
  event: 'เหตุการณ์', actor: 'ผู้ลงมือ', quiet: 'เข้าหาอย่างเงียบเชียบ', force: 'ใช้กำลังเปิดทาง', observe: 'สังเกตก่อน', noisy: 'เสียงดัง', unknown: 'ยังไม่ทราบ',
  damage: 'ความเสียหายที่อาจได้รับ', death: 'อาจเสียชีวิตถาวร', loot: 'ของที่อาจพบ (โอกาส 75%)', confirm: 'ยืนยันการกระทำ',
  areaDone: 'สำรวจเส้นทางนี้ครบแล้ว กลับป้อมได้', rescue: 'พากลับป้อม', waiting: 'มีนักเดินทางบาดเจ็บรออยู่ ทักษะของเขาบ่งบอกว่ารู้จักเส้นทางเก่า',
  helper: 'ผู้ช่วยพยุง', escortHint: 'ผู้บาดเจ็บแต่ละคนลดกำลังแบกของผู้ช่วย 2 ช่อง และจองที่พักหนึ่งที่',
  collect: 'เก็บของที่ทำเครื่องหมายไว้', leave: 'เลือกของที่จะขน', keep: 'เก็บ', packHint: 'เลือกจำนวนที่จะขนก่อนยืนยัน ของที่เหลือจะอยู่ที่จุดทำเครื่องหมายนี้',
  location: 'จุดทำเครื่องหมาย', knowledge: 'สิ่งที่ยืนยันแล้ว', empty: 'ยังไม่มีข้อมูล', more: 'โหลดเพิ่ม',
  survivor: 'ผู้รอดชีวิต', traveler: 'นักเดินทาง', arrival: 'ผู้มาใหม่', working: 'กำลังทำงาน', outside: 'กำลังสำรวจ',
  error: 'ยังทำสิ่งนี้ไม่ได้ โปรดตรวจวัสดุ พื้นที่ ผู้ช่วย และเสบียง',
  jobCost: 'วัสดุและนาทีโฟกัส', resetRisk: 'ความตายถาวร ป้อมและความรู้ยังอยู่',
}
export const shelterText = (language: Language) => language === 'th' ? th : en
export function survivorName(id: string, language: Language) {
  const t = shelterText(language)
  if (id.startsWith('survivor-')) return `${t.survivor} ${id.slice(9)}`
  return id.startsWith('rescued-') ? `${t.traveler} ${['traveler', 'hermit', 'prisoner'].indexOf(id.slice(8)) + 1}` : t.arrival
}
const clues: Record<string, [string, string]> = {
  tracks: ['Cloven tracks stop at the iron fence. The creature avoids cold iron.', 'รอยเท้ากีบหยุดตรงรั้วเหล็ก สิ่งมีชีวิตนี้หลีกเลี่ยงเหล็กเย็น'],
  traveler: ['A traveler calls from beneath a collapsed wagon. A narrow path leads into the hollow.', 'นักเดินทางร้องเรียกใต้เกวียนที่พัง มีทางแคบมุ่งสู่หุบเขา'],
  lanterns: ['Lights above the marsh mimic human voices. Following them is dangerous.', 'แสงเหนือบึงเลียนเสียงคน การตามแสงนั้นเป็นอันตราย'],
  roots: ['Rowan branches mark a path through the roots.', 'กิ่งโรแวนชี้เส้นทางผ่านรากไม้'],
  bells: ['Bells ring without wind. The hollow is listening.', 'ระฆังดังทั้งที่ไม่มีลม หุบเขากำลังฟัง'],
  hermit: ['A wounded hermit knows a road to the barrow.', 'ฤๅษีบาดเจ็บรู้เส้นทางไปสุสาน'],
  ward: ['An old ward still protects the abandoned shrine.', 'อาคมเก่ายังคุ้มครองศาลร้าง'],
  gate: ['The stone gate opens toward the setting sun.', 'ประตูหินเปิดไปทางอาทิตย์อัสดง'],
  bones: ['Disturbed bones carry signs of a revenant.', 'กระดูกที่ถูกรบกวนมีร่องรอยของผู้ตายหวนคืน'],
  shade: ['The shade retreats from the old iron nails.', 'เงามืดถอยหนีตะปูเหล็กเก่า'],
  prisoner: ['A prisoner waits behind a broken ward.', 'เชลยรออยู่หลังอาคมที่แตกสลาย'],
  crown: ['The crown is a warning. The dead remember its bearer.', 'มงกุฎเป็นคำเตือน ผู้ตายยังจดจำผู้สวมมัน'],
}
export const eventText = (id: string, language: Language) => clues[id]?.[language === 'th' ? 1 : 0] ?? ''
