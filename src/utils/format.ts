export const formatNumber = (num: number): string => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const sign = num < 0 ? '-' : '';
    const absNum = Math.abs(num);

    if (absNum < 10000) {
        return `${sign}${Math.floor(absNum).toLocaleString('en-US')}`;
    }

    const units = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];

    // 10,000 이상일 때 a 단위(divisor 1000)부터 시작
    // absNum = 10,000 => exp = 4. (4-1)/3 = 1 => 10,000 / 1,000 = 10a
    // absNum = 9,999,000 => exp = 6. (6-1)/3 = 1 => 9,999,000 / 1,000 = 9999a
    // absNum = 10,000,000 => exp = 7. (7-1)/3 = 2 => 10,000,000 / 1,000,000 = 10b
    const exp = Math.floor(Math.log10(absNum));
    const unitIndex = Math.min(Math.floor((exp - 1) / 3) - 1, units.length - 1);
    const safeUnitIndex = Math.max(0, unitIndex);

    const unit = units[safeUnitIndex];
    const divisor = Math.pow(10, (safeUnitIndex + 1) * 3);
    const value = Math.floor(absNum / divisor);

    return `${sign}${value}${unit}`;
};
