// The clinic's ground floor in block_e1 (places/clinic.js, docs/game/places.md): its things and registration IDs.
export const CLINIC_DETAILS = {
  things: {
    clinic_exit: { label: 'Fountain plaza', kind: 'thing', verb: 'Go out' },
    clinic_nurse: { label: 'Nurse', kind: 'person' },
    exam_bed: { label: 'Examination bed', kind: 'thing', verb: 'Sit', pin: 'near' },
  },
  spots: ['clinic_in', 'reception', 'pharmacy', 'exam_bed', 'waiting', 'nurse_desk', 'bedside'],
  seats: ['exam_bed'],
  people: ['clinic_nurse'],
  zones: [],
  nooks: [],
  hooks: [],
};
