// Docs only: switches for the mock shop, so error and empty states can be tried out.
const OFFLINE = 'ds-mock-offline';

function storage() {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

for (const button of document.querySelectorAll('[data-demo-offline]')) {
  const sync = () =>
    button.setAttribute('aria-pressed', String(storage()?.getItem(OFFLINE) === '1'));
  sync();
  button.addEventListener('click', () => {
    const on = storage()?.getItem(OFFLINE) === '1';
    if (on) storage()?.removeItem(OFFLINE);
    else storage()?.setItem(OFFLINE, '1');
    sync();
  });
}

// "Someone else buys this": marks a variant sold in the mock, then reloads so the
// basket is re-read the way it would be on the next page view.
for (const button of document.querySelectorAll('[data-demo-sell]')) {
  button.addEventListener('click', () => {
    const sold = new Set(JSON.parse(storage()?.getItem('ds-mock-sold') ?? '[]'));
    sold.add(button.dataset.demoSell);
    storage()?.setItem('ds-mock-sold', JSON.stringify([...sold]));
    location.reload();
  });
}

for (const button of document.querySelectorAll('[data-demo-reset]')) {
  button.addEventListener('click', () => {
    storage()?.removeItem('ds-cart-id');
    storage()?.removeItem('ds-mock-sold');
    storage()?.removeItem(OFFLINE);
    location.reload();
  });
}
