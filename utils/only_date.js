export function onlyDate(date) {
    if (date != null) {
        if(typeof date == Date){
            const d= date;
            d.setHours(0, 0, 0, 0);

            return d;
        }else{
            const d= new Date(date);
            d.setHours(0, 0, 0, 0);

            return d;

        }

    } else {
        const d= new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

}