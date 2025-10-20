import { startCountdowns } from "./countdown.js";
import { loadInventory } from "./inventory.js";

const config = window.XUR_CONFIG || {};

startCountdowns();
loadInventory(config);
