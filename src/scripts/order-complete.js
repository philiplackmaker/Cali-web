// /order-thanks/: the buyer has paid at Stripe, so empty their basket.
import { getCartStore } from './commerce.js';

getCartStore().then((store) => store.clear());
