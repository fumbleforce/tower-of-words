// Runtime constructors remain separate from the data-only place and travel contracts.
import { trainPlace as train } from './train.js';
import { lobbyPlace as gate } from './lobby.js';
import { forecourtPlace as forecourt } from './forecourt.js';
import { printShopPlace as print_shop } from './print-shop.js';
import { campusPlace as campus } from './campus.js';
import { canteenPlace as canteen } from './canteen.js';
import { plazaPlace as plaza } from './plaza.js';
import { officePlace as office } from './office.js';
import { dormCourtPlace as dorm_court } from './dorm-court.js';
import { dormsPlace as dorms } from './dorms.js';
import { shotengaiPlace as shotengai } from './shotengai.js';
import { bakeryPlace as bakery } from './bakery.js';
import { konbiniPlace as konbini } from './konbini.js';
import { izakayaPlace as izakaya } from './izakaya.js';
import { karaokePlace as karaoke } from './karaoke.js';
import { karaokeBoothPlace as karaoke_booth } from './karaoke-booth.js';
import { eastLanePlace as east_lane } from './east-lane.js';
import { eastCoastPlace as east_coast } from './east-coast.js';
import { commonsPlace as dorm_commons } from './commons.js';
import { sportsPlace as sports } from './sports.js';
import { poolPlace as pool } from './pool.js';
import { gymPlace as gym } from './gym.js';
import { officeQuarterPlace as office_quarter } from './office-quarter.js';
import { ferryTerminalPlace as ferry_terminal } from './ferry-terminal.js';
import { harbourPlace as harbour } from './harbour.js';
import { worksPlace as works } from './works.js';

export const PLACES = {
  train,
  gate,
  forecourt,
  plaza,
  canteen,
  campus,
  print_shop,
  office,
  dorm_court,
  dorms,
  shotengai,
  izakaya,
  bakery,
  konbini,
  karaoke,
  karaoke_booth,
  east_lane,
  east_coast,
  dorm_commons,
  sports,
  pool,
  gym,
  office_quarter,
  harbour,
  ferry_terminal,
  works,
};
