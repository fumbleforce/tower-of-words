export default { start: 'arrive', on: { 'talk:izakaya_exit': 'leave', 'zone:izakaya_exit': 'leave' }, nodes: { arrive: [], leave: [{ do: 'trip', to: 'shotengai' }] } };
