/**
 * Format date to YYYY-MM-DD format
 * Handles both ISO string format and Date objects
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  if (typeof date === 'string') {
    // If it's already in ISO format or contains T, extract just the date part
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    // If it's already just a date string, return as is
    return date;
  }
  
  // If it's a Date object
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return '';
};
