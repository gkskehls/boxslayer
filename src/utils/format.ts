export const formatNumber = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const sign = num < 0 ? '-' : '';
    const absNum = Math.abs(num);

    if (absNum < 10000) {
        return `${sign}${Math.floor(absNum).toLocaleString('en-US')}`;
    }

    const units = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
    const exp = Math.floor(Math.log10(absNum) / 3);
    const unitIndex = Math.min(Math.max(0, exp - 1), units.length - 1);
    const unit = units[unitIndex];
    const divisor = Math.pow(10, (unitIndex + 1) * 3);
    const value = absNum / divisor;

    let formatted: string;
    if (value % 1 === 0) {
        formatted = value.toFixed(0);
    } else if (value < 10) {
        formatted = value.toFixed(2).replace(/\.?0+$/, '');
    } else {
        formatted = value.toFixed(1).replace(/\.?0+$/, '');
    }

    return `${sign}${formatted}${unit}`;
};
