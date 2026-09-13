/**
 * The two pieces of chrome the price level tool puts on screen: the modal that
 * edits a level, and the right-click menu on one.
 *
 * Both are built in the DOM rather than as Vue components, and both carry
 * hardcoded English. That is the one thing about this module that is wrong and
 * known to be wrong — it belongs in `components/charts/` as an SFC with i18n
 * keys, and until it moves it cannot be translated. It is kept apart from the
 * tool itself so that the move is a matter of deleting this file and raising an
 * event instead.
 *
 * Nothing here reaches back into the tool: it is handed the level to edit and a
 * set of callbacks, and answers with the function that takes it back down.
 */
import { type LineStyle } from '@/lib/lightweight-charts/renderers/draw-line';

/** The fields the dialog can change. Everything else about a level is fixed. */
export type PriceLevelEdit = {
    price: number;
    text: string;
    color: string;
    lineStyle: LineStyle;
};

export type PriceLevelDialogHandlers = {
    onSave: (edited: PriceLevelEdit) => void;
    /** `null` for a level that does not exist yet — there is nothing to delete. */
    onDelete: (() => void) | null;
};

export type ContextMenuHandlers = {
    onEdit: () => void;
    onDelete: () => void;
};

const INPUT_STYLE = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '7px 8px',
    backgroundColor: 'var(--color-bg)',
    border: '1.5px solid var(--color-elevated)',
    borderRadius: '6px',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.18s, background 0.18s',
};

const BUTTON_STYLE = {
    flex: '1',
    padding: '7px 14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'background 0.18s',
};

const MENU_ITEM_STYLE = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '12px',
};

/**
 * Opens the modal over the whole page, focused on the label field.
 *
 * Returns the function that closes it, which the caller must keep — the dialog
 * does not close itself on save, because only the caller knows whether the save
 * was accepted.
 */
export function openPriceLevelDialog(
    level: PriceLevelEdit,
    styles: { offered: readonly LineStyle[]; labels: Record<number, string> },
    handlers: PriceLevelDialogHandlers,
): () => void {
    const dialog = document.createElement('div');
    dialog.className = 'price-level-input-dialog';
    applyStyle(dialog, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '20px',
        zIndex: '10000',
        width: '300px',
        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--color-accent-4)',
        animation: 'popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards',
    });

    const title = document.createElement('h3');
    title.textContent = 'Price Level';
    applyStyle(title, {
        margin: '0 0 14px 0',
        color: 'var(--color-accent-1)',
        fontSize: '1.1rem',
        fontWeight: '700',
        letterSpacing: '0.01em',
    });
    dialog.appendChild(title);

    const grid = document.createElement('div');
    applyStyle(grid, {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '14px',
    });

    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.step = '0.01';
    priceInput.value = level.price.toString();
    grid.appendChild(labelled('Price', styleField(priceInput), { fullWidth: false }));

    const styleSelect = document.createElement('select');
    styleField(styleSelect).style.cursor = 'pointer';
    for (const offered of styles.offered) {
        const option = document.createElement('option');
        option.value = offered.toString();
        option.textContent = styles.labels[offered] ?? offered.toString();
        styleSelect.appendChild(option);
    }
    styleSelect.value = level.lineStyle.toString();
    grid.appendChild(labelled('Style', styleSelect, { fullWidth: false }));

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = level.text;
    textInput.placeholder = 'Stop Loss, Target, etc.';
    grid.appendChild(labelled('Label', styleField(textInput), { fullWidth: true }));

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = level.color;
    applyStyle(colorInput, { ...INPUT_STYLE, padding: '6px', height: '36px', cursor: 'pointer' });
    grid.appendChild(labelled('Color', colorInput, { fullWidth: true }));

    dialog.appendChild(grid);

    const overlay = document.createElement('div');
    overlay.className = 'price-level-overlay';
    applyStyle(overlay, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(24, 25, 38, 0.55)',
        backdropFilter: 'blur(2px)',
        zIndex: '9999',
    });

    const close = (): void => {
        dialog.remove();
        overlay.remove();
    };

    const buttons = document.createElement('div');
    applyStyle(buttons, { display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end' });

    const cancel = button('Cancel', {
        background: 'transparent',
        text: 'var(--color-text-muted)',
        hoverBackground: 'transparent',
    });
    applyStyle(cancel, { border: '1.5px solid var(--color-elevated)', transition: 'border-color 0.18s, color 0.18s' });
    cancel.addEventListener('mouseenter', () => {
        cancel.style.borderColor = 'var(--color-accent-1)';
        cancel.style.color = 'var(--color-accent-1)';
    });
    cancel.addEventListener('mouseleave', () => {
        cancel.style.borderColor = 'var(--color-elevated)';
        cancel.style.color = 'var(--color-text-muted)';
    });
    cancel.addEventListener('click', close);
    buttons.appendChild(cancel);

    const onDelete = handlers.onDelete;
    if (onDelete !== null) {
        const remove = button('Delete', { background: '#f23645', text: '#ffffff', hoverBackground: '#d32f3f' });
        remove.addEventListener('click', () => {
            onDelete();
            close();
        });
        buttons.appendChild(remove);
    }

    const save = button('Save', {
        background: 'var(--color-accent-1)',
        text: 'var(--color-text-inverted)',
        hoverBackground: 'var(--color-accent-2)',
    });
    save.addEventListener('click', () => {
        // The options were appended from `offered` in order, so the selected
        // index is the style
        const lineStyle = styles.offered[styleSelect.selectedIndex];
        if (lineStyle === undefined) return;

        handlers.onSave({
            price: parseFloat(priceInput.value),
            text: textInput.value,
            color: colorInput.value,
            lineStyle,
        });
        close();
    });
    buttons.appendChild(save);

    dialog.appendChild(buttons);

    overlay.addEventListener('click', close);
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    textInput.focus();
    textInput.select();

    return close;
}

/** Opens the right-click menu at a viewport position, and answers with its element. */
export function openPriceLevelMenu(at: { x: number; y: number }, handlers: ContextMenuHandlers): HTMLDivElement {
    const menu = document.createElement('div');
    menu.className = 'price-level-context-menu';
    applyStyle(menu, {
        position: 'fixed',
        left: `${at.x}px`,
        top: `${at.y}px`,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-elevated)',
        borderRadius: '4px',
        padding: '4px',
        zIndex: '10001',
        minWidth: '120px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    });

    menu.appendChild(menuItem('Edit', 'var(--color-text)', 'var(--color-accent-1)', handlers.onEdit));
    menu.appendChild(menuItem('Delete', '#f23645', '#f23645', handlers.onDelete));

    document.body.appendChild(menu);
    return menu;
}

function applyStyle(element: HTMLElement, style: Record<string, string>): void {
    for (const [property, value] of Object.entries(style)) {
        element.style.setProperty(toKebabCase(property), value);
    }
}

function toKebabCase(property: string): string {
    return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** Applies the shared field styling, plus the focus ring every field shares. */
function styleField<T extends HTMLElement>(field: T): T {
    applyStyle(field, INPUT_STYLE);

    field.addEventListener('focus', () => {
        field.style.borderColor = 'var(--color-accent-1)';
        field.style.backgroundColor = 'var(--color-sunken)';
    });
    field.addEventListener('blur', () => {
        field.style.borderColor = 'var(--color-elevated)';
        field.style.backgroundColor = 'var(--color-bg)';
    });

    return field;
}

function labelled(text: string, field: HTMLElement, layout: { fullWidth: boolean }): HTMLDivElement {
    const container = document.createElement('div');
    if (layout.fullWidth) container.style.gridColumn = '1 / -1';

    const label = document.createElement('label');
    label.textContent = text;
    applyStyle(label, {
        display: 'block',
        color: 'var(--color-text-muted)',
        fontSize: '0.8rem',
        fontWeight: '500',
        marginBottom: '4px',
    });

    container.appendChild(label);
    container.appendChild(field);
    return container;
}

function button(
    text: string,
    colors: { background: string; text: string; hoverBackground: string },
): HTMLButtonElement {
    const element = document.createElement('button');
    element.textContent = text;
    applyStyle(element, { ...BUTTON_STYLE, backgroundColor: colors.background, color: colors.text });

    element.addEventListener('mouseenter', () => {
        element.style.backgroundColor = colors.hoverBackground;
    });
    element.addEventListener('mouseleave', () => {
        element.style.backgroundColor = colors.background;
    });

    return element;
}

function menuItem(text: string, color: string, hoverBackground: string, onClick: () => void): HTMLDivElement {
    const item = document.createElement('div');
    item.textContent = text;
    item.className = 'context-menu-item';
    applyStyle(item, { ...MENU_ITEM_STYLE, color });

    item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = hoverBackground;
        item.style.color = 'var(--color-text-inverted)';
    });
    item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
        item.style.color = color;
    });
    item.addEventListener('click', (event) => {
        event.stopPropagation();
        onClick();
    });

    return item;
}
