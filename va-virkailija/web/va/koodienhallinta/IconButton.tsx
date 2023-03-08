import { ButtonHTMLAttributes } from 'react'
import React from 'react'
import styles from './IconButton.module.less'

export function IconButton(props: ButtonHTMLAttributes<any>) {
  const { className, children, ...restProps } = props
  return (
    <button className={`${styles.codeIconButton} ${className ?? ''}`} {...restProps}>
      {children}
    </button>
  )
}

export function IconSave() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18.75 2.53906L8.125 13.1641C7.96875 13.3594 7.73438 13.4375 7.5 13.4375C7.22656 13.4375 6.99219 13.3594 6.83594 13.1641L1.21094 7.53906C0.820312 7.1875 0.820312 6.60156 1.21094 6.25C1.5625 5.85938 2.14844 5.85938 2.5 6.25L7.5 11.2109L17.4609 1.25C17.8125 0.859375 18.3984 0.859375 18.75 1.25C19.1406 1.60156 19.1406 2.1875 18.75 2.53906Z"
        fill="#499CC7"
      />
    </svg>
  )
}

export function IconEdit() {
  return (
    <svg width="22" height="21" viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.2578 2.72656L18.7734 1.24219C18.3047 0.773438 17.6406 0.5 17.0156 0.5C16.3906 0.5 15.7266 0.773438 15.2578 1.24219L2.21094 14.2891C2.09375 14.3672 2.05469 14.4844 2.01562 14.6016L1 19.7188C0.921875 20.1484 1.23438 20.5 1.58594 20.5C1.625 20.5 1.70312 20.5 1.74219 20.5L6.85938 19.4844C6.97656 19.4453 7.09375 19.4062 7.21094 19.2891L20.2578 6.24219C21.2344 5.26562 21.2344 3.70312 20.2578 2.72656ZM5.375 12.9219L13.3047 4.95312L16.5469 8.19531L8.57812 16.125H5.375V12.9219ZM6.42969 18.2734L2.40625 19.0938L3.22656 15.0703L4.125 14.1719V17.375H7.32812L6.42969 18.2734ZM19.3594 5.34375L17.4453 7.29688L14.2031 4.09375L16.1562 2.14062C16.3516 1.90625 16.6641 1.75 17.0156 1.75C17.3672 1.75 17.6797 1.90625 17.9141 2.14062L19.3594 3.58594C19.8672 4.09375 19.8672 4.875 19.3594 5.34375Z"
        fill="#499CC7"
      />
    </svg>
  )
}

export function IconRemove() {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 0.5C4.45312 0.5 0 4.99219 0 10.5C0 16.0469 4.45312 20.5 10 20.5C15.5078 20.5 20 16.0469 20 10.5C20 4.99219 15.5078 0.5 10 0.5ZM13.75 11.4375H6.25C5.70312 11.4375 5.3125 11.0469 5.3125 10.5C5.3125 9.99219 5.70312 9.5625 6.25 9.5625H13.75C14.2578 9.5625 14.6875 9.99219 14.6875 10.5C14.6875 11.0469 14.2578 11.4375 13.75 11.4375Z"
        fill="#BA3E35"
      />
    </svg>
  )
}

export function IconAdd() {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 0.5C4.45312 0.5 0 4.99219 0 10.5C0 16.0469 4.45312 20.5 10 20.5C15.5078 20.5 20 16.0469 20 10.5C20 4.99219 15.5078 0.5 10 0.5ZM13.75 11.4375H10.9375V14.25C10.9375 14.7969 10.5078 15.1875 10 15.1875C9.45312 15.1875 9.0625 14.7969 9.0625 14.25V11.4375H6.25C5.70312 11.4375 5.3125 11.0469 5.3125 10.5C5.3125 9.99219 5.70312 9.5625 6.25 9.5625H9.0625V6.75C9.0625 6.24219 9.45312 5.8125 10 5.8125C10.5078 5.8125 10.9375 6.24219 10.9375 6.75V9.5625H13.75C14.2578 9.5625 14.6875 9.99219 14.6875 10.5C14.6875 11.0469 14.2578 11.4375 13.75 11.4375Z"
        fill="#499CC7"
      />
    </svg>
  )
}
