<script>
    import { onMount, onDestroy, beforeUpdate, afterUpdate} from 'svelte';
    import CharityList from "../components/CharityList.svelte";
    import Header from "../components/Header.svelte";
    import Welcome from "../components/Welcome.svelte";
    import Promo from "../components/Promo.svelte";
    import Footer from "../components/Footer.svelte" ;
    import { charities } from "../data/charities.js"; 


    let title = "Charity";

    onMount(function() {
      console.log("onMount");
    });
    onDestroy(function() {
      console.log("onDestroy");
    });
    beforeUpdate(function() {
      console.log("beforeUpate");
    });
    afterUpdate(function() {
      console.log("afterUpdate");
    });
</script>

<Header />
<Welcome />
 <CharityList {charities} />
 <Promo />
 <Footer />