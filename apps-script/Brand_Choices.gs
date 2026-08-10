const INVENTORY_BRAND_CHOICES = [
  'Richard Mille',
  'Audemars Piguet',
  'Patek Philippe',
  'Rolex',
  'Tag Heuer',
  'Cartier',
  'Omega'
];

/**
 * Safe one-time patch for the existing inventory Form.
 * Converts only "Brand (new products only)" into a dropdown/list question.
 * It does NOT rebuild the Form and does NOT touch File Upload or Box ID questions.
 */
function updateInventoryFormBrandChoices() {
  const ss = SpreadsheetApp.openById(INVENTORY_SPREADSHEET_ID);
  const formId = readSetting_(ss, 'FORM_ID') || PropertiesService.getScriptProperties().getProperty('INVENTORY_FORM_ID');
  if (!formId) throw new Error('Inventory form is not configured.');

  const form = FormApp.openById(formId);
  const title = 'Brand (new products only)';
  const items = form.getItems();
  let target = null;

  for (let i = 0; i < items.length; i++) {
    if (String(items[i].getTitle() || '').trim() === title) {
      target = items[i];
      break;
    }
  }

  if (!target) throw new Error('Brand question not found: ' + title);

  if (target.getType() === FormApp.ItemType.LIST) {
    target.asListItem()
      .setChoiceValues(INVENTORY_BRAND_CHOICES)
      .setRequired(false)
      .setHelpText('Choose the brand for a new product.');
    return;
  }

  const originalIndex = target.getIndex();
  form.deleteItem(target);

  const replacement = form.addListItem()
    .setTitle(title)
    .setChoiceValues(INVENTORY_BRAND_CHOICES)
    .setRequired(false)
    .setHelpText('Choose the brand for a new product.');

  form.moveItem(replacement.getIndex(), originalIndex);
}
