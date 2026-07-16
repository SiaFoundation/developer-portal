import { codeToHtml } from 'shiki';

export interface HeroExample {
  name: string;
  file: string;
  html: string;
}

const SNIPPETS = [
  {
    name: 'Rust',
    file: 'store.rs',
    lang: 'rust',
    code: `// with a connected SDK instance
let reader = std::io::Cursor::new(b"hello, sia!");

let obj = Object::default();
let obj = sdk.upload(obj, reader, UploadOptions::default()).await?;
sdk.pin_object(&obj).await?;

println!("Object ID: {}", obj.id());`,
  },
  {
    name: 'Go',
    file: 'store.go',
    lang: 'go',
    code: `// with a connected SDK client
obj := siastorage.NewEmptyObject()
if err := client.Upload(ctx, &obj, strings.NewReader("hello, sia!")); err != nil {
    panic(err)
}
if err := client.PinObject(ctx, obj); err != nil {
    panic(err)
}
fmt.Println("Object ID:", obj.ID())`,
  },
  {
    name: 'Python',
    file: 'store.py',
    lang: 'python',
    code: `# with a connected SDK instance
obj = await sdk.upload(PinnedObject(), BytesIO(b"hello, sia!"), UploadOptions())
await sdk.pin_object(obj)

print("Object ID:", obj.id())`,
  },
  {
    name: 'Dart',
    file: 'store.dart',
    lang: 'dart',
    code: `// with a connected SDK instance
final upload = sdk.upload(
  object: PinnedObject(),
  source: Stream.value(utf8.encode('hello, sia!')),
);
final obj = await upload.result;
await sdk.pinObject(object: obj);

print('Object ID: \${obj.id()}');`,
  },
  {
    name: 'JS',
    file: 'store.js',
    lang: 'javascript',
    code: `// with a connected SDK instance
const data = new Blob(['hello, sia!']).stream()

const obj = await sdk.upload(new PinnedObject(), data)
await sdk.pinObject(obj)

console.log('Object ID:', obj.id())`,
  },
];

export async function getHeroExamples(): Promise<HeroExample[]> {
  return Promise.all(
    SNIPPETS.map(async ({ name, file, lang, code }) => ({
      name,
      file,
      html: await codeToHtml(code, {
        lang,
        themes: { dark: 'github-dark', light: 'github-light' },
        defaultColor: false,
      }),
    })),
  );
}
