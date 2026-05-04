import type { JSX } from 'solid-js';

export interface FileUploadProps {
  accept?: string;
  onFile: (file: File) => void;
  children: JSX.Element;
  class?: string;
}

export function FileUpload(props: FileUploadProps): JSX.Element {
  let inputRef: HTMLInputElement | undefined;
  return (
    <>
      <button
        type="button"
        class={props.class ?? 'btn btn-sm'}
        onClick={() => inputRef?.click()}
      >
        {props.children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={props.accept}
        class="hidden"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) props.onFile(file);
          e.currentTarget.value = '';
        }}
      />
    </>
  );
}
