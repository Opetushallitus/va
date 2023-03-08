import React from 'react'

export const IconAcceptedWithChanges: React.FC<{ fill?: string }> = ({ fill = '#1A1919' }) => (
  <svg
    data-test-id={'icon-accepted-with-changes'}
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="17"
    viewBox="0 0 18 17"
    fill="none"
  >
    <path
      d="M17.875 8.75L17 7.875C16.9375 7.8125 16.8438 7.75 16.7188 7.75C16.625 7.75 16.5312 7.8125 16.4688 7.875L11 13.3438L8.5 10.8125C8.4375 10.75 8.34375 10.7188 8.25 10.7188C8.125 10.7188 8.03125 10.75 7.96875 10.8125L7.09375 11.7188C7.03125 11.7812 6.96875 11.875 6.96875 11.9688C6.96875 12.0625 7.03125 12.1562 7.09375 12.25L10.7188 15.9062C10.7812 15.9688 10.875 16.0312 10.9688 16.0312C11.0938 16.0312 11.1875 15.9688 11.25 15.9062L17.875 9.28125C17.9375 9.21875 18 9.125 18 9.03125C18 8.90625 17.9375 8.8125 17.875 8.75ZM4.53125 0.34375C4.46875 0.15625 4.28125 0.03125 4.0625 0H2.8125C2.59375 0.03125 2.40625 0.15625 2.34375 0.34375L0 7.34375C0 7.40625 0 7.46875 0 7.5C0 7.78125 0.21875 8 0.5 8H1C1.21875 8 1.40625 7.875 1.5 7.65625L1.875 6.5H5.09375L5.46875 7.65625C5.5625 7.875 5.75 8 5.96875 8H6.5C6.75 8 6.96875 7.78125 6.96875 7.5C6.96875 7.46875 6.96875 7.40625 6.96875 7.34375L4.53125 0.34375ZM2.375 5L3.5 1.84375L4.53125 5H2.375ZM8.75 8H11.625C12.9062 8 13.9688 6.9375 13.9688 5.625C13.9688 4.875 13.625 4.1875 13.0625 3.75C13.3125 3.375 13.4688 2.90625 13.4688 2.40625C13.4688 1.09375 12.4062 0.03125 11.125 0H8.75C8.3125 0 8 0.34375 8 0.75V7.25C8 7.6875 8.3125 8 8.75 8ZM9.5 1.5H11.125C11.5938 1.5 12 1.90625 12 2.375C12 2.875 11.5938 3.25 11.125 3.25H9.5V1.5ZM9.5 4.75H11.625C12.0938 4.75 12.5 5.15625 12.5 5.625C12.5 6.125 12.0938 6.5 11.625 6.5H9.5V4.75Z"
      fill={fill}
    />
  </svg>
)
