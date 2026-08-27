const TODOS = [
  {
    id: 1,
    text: "Canlı Bahislerde market detay bölümünde başlık ve içeriğe ait background renkleri farklı olması gerekiyor. (Örneğin, Maç sonucu içerisinde Takım adına ait bölüm #2A3C50 rengine, oran bölümü ise #38506B renginde olmalı.)",
  },
  {
    id: 2,
    text: "Canlı bahisler - canlı sonuçlar sayfasında herhangi bir karşılaşma seçildiğinde sağ bölümde karşılaşmaya ait olan card tasarımında ışıklandırma ve renk farklılığı kullandık. Sitede ise o alan uygulanmamış.",
  },
  {
    id: 3,
    text: "Sporlar sayfasında sol tarafta yer alan “Yaklaşan Maçlar, Popüler Maçlar, Günün Kombinesi, Popüler Turnuvalar, Artırılmış Oranlar” gibi menü elementlerini Spor seçim menüsünden ayrı tuttuk ve tarz olarak ufak bir farklılık yaptık. Bu alanı bu şekilde tasarlama nedeminiz menülerin ve spor seçimlerinin birbirinden kolayca ayrılabilmesi içindi. Mevcut sitede bu şekilde uygulanmamış.",
  },
  {
    id: 4,
    text: "Slotlar sayfasında oyun ara alanına ait #2A3C50 renginde 1px stroke kullandık mevcut sitede eklenmemiş.",
  },
  {
    id: 5,
    text: "Slotlar sayfasında jackpotları gösteren card tasarımlarında sol üstten yayılan turkuaz renginde blur rengimiz mevcut ve renkler sitemizle uyumlu halde. Mevcut sitede sanırım default şeklinde kullanılmış renkler farklı görünüyor ve turkuaz blur renk yok.",
  },
  {
    id: 6,
    text: "Slotlar sayfasında scroll ettikçe aşağıda görünen turnuvalar bölümünde kalan sürenin karşısında yer alan değer siyah renkte kullanılmış. Bu renk site ile uyumlu olmamış. Çizimde yaptığımız gibi beyaz renk ile düzenlenebilir. Ayrıca kalan süre karşısında iki adet çizgi görünüyor bu çizgi sayısı bir olmalı.",
  },
  {
    id: 7,
    text: "Slotlar sayfasında sağlayıcı seçim ekranında liste görünümüne geçince sağlayıcılara ait background rengi figmada yer alan renkten farklı. Seçilmiş versiyonuda farklı.",
  },
  {
    id: 8,
    text: "Rastgele oyna butonuna tıkladığımızda açılan ekranda butonların görünümü ve renkleri tasarımdan farklı.",
  },
  {
    id: 9,
    text: "Slotlar Game Info sayfasında “Demo ve Oyna” butonlarını sağlayıcı logosu altında yan yana yer verdik. Provided by yazısı ve sağlayıcı logosu sola yaslanmış halde, butonlar hemen altında o alanı dolduracak şekilde yerleştirilmeli. Tab menüde “Diğer Oyunlar” seçili halde olan görünümü tasarımdan farklı.",
  },
  {
    id: 10,
    text: "Turnuvalar sayfasında solda turnuvaya ait görselin, ödül tutarının, kalan sürenin ve katıl butonunun olduğu bölümde kalan süreye ait boxlar birbirine yapışık halde görünüyor. Burada boxlar birbirinden 4px uzaklaşmalı.",
  },
  {
    id: 11,
    text: "Turnuvaya ait textlerin olduğu bölümde turnuva süresi, kayıt tarihi, oyuncular, spinler, turlar gibi başlıklar ve bu alana ait detay içeriklerinin renkleri siyah kullanılmış. Beyaz renkte olmalı.",
  },
  {
    id: 12,
    text: "Turnuva detayına girdiğimizde yukarıda belirttiğim turnuva süresi, kayıt tarihi, oyuncular vs gibi olan alanlar burada da düzenlenmeli ve aşağıda yer alan Ödüller, Puan Tablosu, Kurallar başlıklı yan yana 3lü bölüm figmadan farklı başlık yapısı, background ve liste yapıları dikkate alınarak düzenlenmeli.",
  },
  {
    id: 13,
    text: "Canlı casino sayfasında oyun ara bölümüne 1px stroke eklenmeli.",
  },
  {
    id: 14,
    text: "Canlı casino game info bölümü slotlarda olduğu gibi düzenlenmeli. Sadece canlı casinoda demo butonu olmadığı için Oyna butonu o alanı doldurmalı.",
  },
  {
    id: 15,
    text: "Kayıt sayfasında “Telefon numarası SMS doğrulaması ile onaylanmalıdır.” uyarı metni çok büyük kullanılmış. Kayıt-Mobil sayfasında telefon numarası alanının altında kullandığımız uyarı bölümü dikkate alınarak o alan düzenlenebilir.",
  },
  {
    id: 16,
    text: "Kayıt giriş sayfaları genel olarak bizim tasarladığımız yapıdan farklı görünüyor. O alanda figmada yerleşimlerin tekrar incelenmesi ve ona göre düzenlenmesi gerekiyor.",
  },
  {
    id: 17,
    text: "Para çek sayfasında çekilebilir tutar, bakiye, oynanmamış tutar vs gibi liste bölümü figmadan farklı görünüyor. Bu bölüm düzenlenmeli.",
  },
  {
    id: 18,
    text: "İşlem geçmişinde filtreleme bölümünde Göster butonu yerine Tick iconu yerleştirdik ve kare ölçülerinde filtreleme içeriklerinin yanına ekledik. Mevcut sitede de bu şekilde düzenlenmeli. İşlem geçmişinde Tutar alanına ait içeriklerde eksi tutarlar beyaz artı tutarlar yeşil renkte tasarladık. Eğer bu alan tek renk oluyorsa beyaz olmalı. Son bakiye bölümünde turkuaz renk kullandık mevcut sitede yeşil görünüyor turkuaz olarak değişmeli.",
  },
  {
    id: 19,
    text: "Bilgi ekranında Para yatır - Para Çek tab menü figmada farklı bir tarzda.",
  },
  {
    id: 20,
    text: "Bahis geçmişi sayfasında filtreleme yapısı yukarıda bahsettiğimiz işlem geçmişinde olduğu gibi olmalı. Listeleme yapısı Figmadan farklı durumda renkler, kullanımlar vs.",
  },
  {
    id: 21,
    text: "Bonuslar sayfasında yer alan figmada çizdiğimiz yapı ve renkler mevcut siteden farklı incelenerek düzenlenmeli.",
  },
  {
    id: 22,
    text: "Casino Freespinleri sayfasında yapı ve renkler figmaya göre düzenlenmeli.",
  },
  {
    id: 23,
    text: "E-Sporlar sayfaları henüz uygulanmamış tasarıma göre uygulanmalı.",
  },
];
