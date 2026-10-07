export default {
 start:'arrive',
 on:{'talk:print_exit':'exit','talk:directory_printer':'directory','talk:print_seat':'sit'},
 nodes:{arrive:[],exit:[{do:'trip',to:'campus'}],directory:[{choice:[{text:'Print the island directory (free).',go:'print'},{text:'Leave.',go:'end'}]}],print:[{do:'printDirectory'}],sit:[{do:'sit',who:'eric',at:'print_seat'}],end:[]},
};
