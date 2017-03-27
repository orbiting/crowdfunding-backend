exports.seed = async function(knex, Promise) {
  await knex('faqs').del()

  await knex('faqs').insert({
    question: "Seid ihr auf die Schweiz fokussiert oder global?",
    answer: "Wir sind sind national fokussiert, aber viele Themen die uns interessieren (Automatisierung, Digital-Age, Politische Erdbeben) machen keinen Halt an der Landesgrenze.",
  })

  await knex('faqs').insert({
    question: "Ab wann kann ich das Magazin lesen?",
    answer: "Wir werden anfang 2018 starten.",
  })

  await knex('faqs').insert({
    question: "Über welche Themen werdet ihr berichten?",
    answer: "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.",
  })

}
