export const capFirst = (string: string) => {
	return string.charAt(0).toUpperCase() + string.slice(1);
};

export const getRandomInt = (min: number, max: number) => {
	return Math.floor(Math.random() * (max - min)) + min;
};

export const enumToName = (e: string) => {
	return e.toLowerCase().split('_').map(capFirst).join(' ');
};

export const removeNull = <T extends Record<string, unknown>>(obj: T) =>
	Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== null)) as {
		[K in keyof T]?: Exclude<T[K], null>;
	};

const wholeMoneyFormatter = new Intl.NumberFormat('tr-TR', {
	style: 'currency',
	currency: 'TRY',
	maximumFractionDigits: 0
});
const fractionalMoneyFormatter = new Intl.NumberFormat('tr-TR', {
	style: 'currency',
	currency: 'TRY',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
// An amount shows no kuruş or both digits — never "₺89,9".
export const formatMoney = (money: string | number) => {
	const value = typeof money === 'string' ? Number(money) : money;
	return (Number.isInteger(value) ? wholeMoneyFormatter : fractionalMoneyFormatter).format(value);
};

/** A listing's asking price, whole lira. Every listing has one. */
export const formatPrice = (price: number) => formatMoney(price);

/** 4.8 → "4,8". The backend already rounds averages to one decimal. */
export const formatRating = (rating: number) =>
	rating.toLocaleString('tr-TR', { minimumFractionDigits: 1 });

export const formatFileName = (fileName: string, maxSize = 20) => {
	const extensionIndex = fileName.lastIndexOf('.');
	if (extensionIndex === -1 || extensionIndex === 0 || extensionIndex === fileName.length - 1) {
		throw new Error('Invalid filename');
	}

	const namePart = fileName.substring(0, extensionIndex);
	const extension = fileName.substring(extensionIndex);

	if (namePart.length <= maxSize) {
		return fileName; // No need to shorten
	}

	return namePart.slice(0, 5) + '...' + namePart.slice(-5) + extension;
};

export const formatBytes = (bytes: number) => {
	if (bytes === 0) return '0B';
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
};

export const normalizeTurkish = (str: string) =>
	str
		.toLowerCase()
		.replace(/ğ/g, 'g')
		.replace(/ü/g, 'u')
		.replace(/ş/g, 's')
		.replace(/ı/g, 'i')
		.replace(/i̇/g, 'i')
		.replace(/İ/g, 'i')
		.replace(/ö/g, 'o')
		.replace(/ç/g, 'c');
