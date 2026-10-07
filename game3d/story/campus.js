// The built streets behind head office; every exit follows the same pavement in the neighbouring district.
export default {
 start:'arrive',
 on:{'talk:print_shop':'to_print','talk:forecourt':'to_forecourt','zone:forecourt_exit':'to_forecourt','talk:office_quarter':'to_offices','talk:office_shed':'to_offices','zone:office_quarter_exit':'to_offices','zone:office_shed_exit':'to_offices','talk:harbour':'to_harbour','zone:harbour_exit':'to_harbour','talk:campus_bench':'sit'},
 nodes:{to_print:[{do:'trip',to:'print_shop'}],arrive:[],to_forecourt:[{do:'trip',to:'forecourt'}],to_offices:[{do:'trip',to:'office_quarter'}],to_harbour:[{do:'trip',to:'harbour'}],sit:[{do:'sit',who:'eric',at:'campus_bench'}]},
};
