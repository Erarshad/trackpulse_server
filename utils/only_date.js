export function onlyDate(date) {
    if (date != null) {
        const d= date;
        d.setHours(0, 0, 0, 0);
        return d;

    } else {
        const d= new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

}