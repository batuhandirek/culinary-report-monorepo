import dayjs from "dayjs";

export const MONTHS = new Array(12).fill(1).map((one, idx) => ({
    label: dayjs().locale("tr").startOf("year").add(idx, 'month').format("MMMM"),
    value: idx
}))
